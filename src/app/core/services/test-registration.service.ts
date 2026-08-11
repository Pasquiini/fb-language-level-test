import {
  Injectable,
  inject,
} from '@angular/core';

import {
  AuthService,
} from './auth.service';

import {
  SupabaseService,
} from './supabase.service';

import {
  TestRepositoryService,
} from './test-repository.service';

interface TestRegistrationData {
  fullName: string;
  whatsapp: string;
  email: string;
  perceivedLevel: string;
  studyDuration: string;
  previousSchool: string;
  mainGoal: string;
  preferredModality: string;
  availabilityPeriod: string;
}

interface TestRegistrationResult {
  success: boolean;
  message: string;
  attemptId?: string;
  testId?: string;
}

interface TestAttemptRow {
  id: string;
  test_id: string;
  student_id: string;
  status: string;
}

@Injectable({
  providedIn: 'root',
})
export class TestRegistrationService {
  private readonly auth =
    inject(AuthService);

  private readonly supabase =
    inject(SupabaseService);

  private readonly testRepository =
    inject(TestRepositoryService);

  async register(
    data: TestRegistrationData,
  ): Promise<TestRegistrationResult> {
    try {
      /*
       * 1. Garante uma sessão autenticada.
       *
       * Caso o usuário ainda não tenha sessão,
       * será criada uma sessão anônima.
       */
      const authResult =
        await this.auth.createAnonymousSession(
          data.fullName,
        );

      if (!authResult.success) {
        return {
          success: false,
          message:
            `Não foi possível iniciar sua sessão: ${authResult.message}`,
        };
      }

      const user = this.auth.user();

      if (!user) {
        return {
          success: false,
          message:
            'Não foi possível identificar o usuário autenticado.',
        };
      }

      /*
       * 2. Atualiza os dados pessoais em profiles.
       *
       * role não é enviado e continua protegido
       * pela migration de segurança.
       */
      const {
        error: profileError,
      } = await this.supabase.client
        .from('profiles')
        .update({
          full_name: data.fullName.trim(),
          email: data.email
            .trim()
            .toLowerCase(),
          whatsapp: data.whatsapp.trim(),
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        throw new Error(
          `Não foi possível atualizar o perfil: ${profileError.message}`,
        );
      }

      /*
       * 3. Cria ou atualiza student_profiles.
       *
       * user_id é a PK e FK para profiles.id.
       */
      const {
        error: studentProfileError,
      } = await this.supabase.client
        .from('student_profiles')
        .upsert(
          {
            user_id: user.id,
            perceived_level:
              data.perceivedLevel,
            study_duration:
              data.studyDuration,
            previous_school:
              data.previousSchool.trim() || null,
            main_goal:
              data.mainGoal,
            preferred_modality:
              data.preferredModality,
            availability_period:
              data.availabilityPeriod,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          },
        );

      if (studentProfileError) {
        throw new Error(
          `Não foi possível salvar os dados do aluno: ${studentProfileError.message}`,
        );
      }

      /*
       * 4. Busca o teste ativo.
       */
      const activeTest =
        await this.testRepository
          .getActiveTest();

      if (!activeTest) {
        return {
          success: false,
          message:
            'Nenhum teste de nivelamento ativo foi encontrado.',
        };
      }

      /*
       * 5. Cria a tentativa.
       *
       * id, status, started_at, created_at
       * e updated_at são definidos pelo banco.
       */
      const {
        data: attempt,
        error: attemptError,
      } = await this.supabase.client
        .from('test_attempts')
        .insert({
          test_id: activeTest.id,
          student_id: user.id,
        })
        .select(`
          id,
          test_id,
          student_id,
          status
        `)
        .single<TestAttemptRow>();

      if (attemptError) {
        throw new Error(
          `Não foi possível iniciar o teste: ${attemptError.message}`,
        );
      }

      /*
       * Atualiza o Signal de perfil do AuthService
       * com nome, e-mail e WhatsApp recém-gravados.
       */
      await this.auth.refreshProfile();

      return {
        success: true,
        message:
          'Cadastro concluído e teste iniciado.',
        attemptId: attempt.id,
        testId: attempt.test_id,
      };
    } catch (error) {
      console.error(
        'Test registration error:',
        error,
      );

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Ocorreu um erro inesperado ao iniciar o teste.',
      };
    }
  }
}
