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

interface SaveSpeakingAnswerParams {
  attemptId: string;
  questionId: string;
  blob: Blob;
  durationSeconds: number;
}

export interface SpeakingAnswerItem {
  questionId: string;
  audioPath: string;
  durationSeconds: number;
}

interface SpeakingAnswerRow {
  question_id: string;
  audio_path: string;
  duration_seconds: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class SpeakingAnswerService {
  private readonly supabase =
    inject(SupabaseService);

  private readonly auth =
    inject(AuthService);

  async getAnswers(
    attemptId: string,
  ): Promise<
    Record<
      string,
      SpeakingAnswerItem
    >
  > {
    await this.auth
      .waitUntilInitialized();

    const user =
      this.auth.user();

    if (!user) {
      throw new Error(
        'Nenhum usuário autenticado foi encontrado.',
      );
    }

    const {
      data,
      error,
    } =
      await this.supabase.client
        .from(
          'speaking_answers',
        )
        .select(
          `
            question_id,
            audio_path,
            duration_seconds
          `,
        )
        .eq(
          'attempt_id',
          attemptId,
        );

    if (error) {
      console.error(
        'Could not load speaking answers:',
        error,
      );

      throw new Error(
        'Não foi possível recuperar suas respostas de speaking.',
      );
    }

    const answers:
      Record<
        string,
        SpeakingAnswerItem
      > = {};

    for (
      const row of
        (data ?? []) as
          SpeakingAnswerRow[]
    ) {
      answers[
        row.question_id
      ] = {
        questionId:
          row.question_id,

        audioPath:
          row.audio_path,

        durationSeconds:
          Math.max(
            0,
            Math.round(
              row.duration_seconds ??
                0,
            ),
          ),
      };
    }

    return answers;
  }

  async createSignedAudioUrl(
    audioPath: string,
  ): Promise<string> {
    await this.auth
      .waitUntilInitialized();

    const user =
      this.auth.user();

    if (!user) {
      throw new Error(
        'Nenhum usuário autenticado foi encontrado.',
      );
    }

    const {
      data,
      error,
    } =
      await this.supabase.client
        .storage
        .from(
          'speaking-audio',
        )
        .createSignedUrl(
          audioPath,
          10 * 60,
        );

    if (
      error ||
      !data?.signedUrl
    ) {
      console.error(
        'Could not create speaking audio signed URL:',
        error,
      );

      throw new Error(
        'Não foi possível carregar a gravação salva.',
      );
    }

    return data.signedUrl;
  }

  async saveAnswer(
    params: SaveSpeakingAnswerParams,
  ): Promise<SpeakingAnswerItem> {
    await this.auth
      .waitUntilInitialized();

    const user =
      this.auth.user();

    if (!user) {
      throw new Error(
        'Nenhum usuário autenticado foi encontrado.',
      );
    }

    const extension =
      this.getExtension(
        params.blob.type,
      );

    const audioPath =
      `${user.id}/${params.attemptId}/${params.questionId}.${extension}`;

    const durationSeconds =
      Math.max(
        0,
        Math.round(
          params.durationSeconds,
        ),
      );

    /*
     * Primeiro enviamos o arquivo.
     *
     * O Storage valida:
     *
     * user folder
     * +
     * attempt folder pertencente ao usuário
     * +
     * tentativa ainda aberta.
     */
    const {
      error: uploadError,
    } =
      await this.supabase.client
        .storage
        .from(
          'speaking-audio',
        )
        .upload(
          audioPath,
          params.blob,
          {
            contentType:
              params.blob.type ||
              'audio/webm',

            upsert: true,
          },
        );

    if (uploadError) {
      throw new Error(
        `Não foi possível enviar a gravação: ${uploadError.message}`,
      );
    }

    /*
     * Depois registramos os metadados
     * exclusivamente através da RPC.
     */
    const {
      error: answerError,
    } =
      await this.supabase.client
        .rpc(
          'save_speaking_answer',
          {
            p_attempt_id:
              params.attemptId,

            p_question_id:
              params.questionId,

            p_audio_path:
              audioPath,

            p_duration_seconds:
              durationSeconds,
          },
        );

    if (answerError) {
      console.error(
        'save_speaking_answer RPC error:',
        answerError,
      );

      /*
       * Se o metadata falhar depois do upload,
       * tentamos remover o arquivo órfão.
       */
      const {
        error: cleanupError,
      } =
        await this.supabase.client
          .storage
          .from(
            'speaking-audio',
          )
          .remove([
            audioPath,
          ]);

      if (cleanupError) {
        console.error(
          'Could not remove orphan speaking audio:',
          cleanupError,
        );
      }

      throw new Error(
        this.getSaveErrorMessage(
          answerError.message,
        ),
      );
    }

    return {
      questionId:
        params.questionId,

      audioPath,

      durationSeconds,
    };
  }

  private getExtension(
    mimeType: string,
  ): string {
    if (
      mimeType.includes(
        'mp4',
      )
    ) {
      return 'mp4';
    }

    if (
      mimeType.includes(
        'ogg',
      )
    ) {
      return 'ogg';
    }

    return 'webm';
  }

  private getSaveErrorMessage(
    message: string,
  ): string {
    if (
      message.includes(
        'não é uma questão de speaking',
      )
    ) {
      return (
        'Esta atividade não é uma questão válida de speaking.'
      );
    }

    if (
      message.includes(
        'não pertence a esta tentativa',
      )
    ) {
      return (
        'Esta atividade não pertence à sua avaliação.'
      );
    }

    if (
      message.includes(
        'não corresponde à resposta',
      )
    ) {
      return (
        'Não foi possível validar o arquivo enviado.'
      );
    }

    if (
      message.includes(
        'não aceita mais respostas',
      )
    ) {
      return (
        'Esta avaliação já foi encerrada e não aceita novas gravações.'
      );
    }

    if (
      message.includes(
        'não possui acesso',
      )
    ) {
      return (
        'Não foi possível validar o acesso a esta tentativa.'
      );
    }

    if (
      message.includes(
        'não foi encontrada',
      )
    ) {
      return (
        'A gravação enviada não pôde ser localizada.'
      );
    }

    return (
      'Não foi possível salvar sua gravação. Tente novamente.'
    );
  }
}
