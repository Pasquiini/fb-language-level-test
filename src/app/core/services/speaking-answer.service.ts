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

@Injectable({
  providedIn: 'root',
})
export class SpeakingAnswerService {
  private readonly supabase =
    inject(SupabaseService);

  private readonly auth =
    inject(AuthService);

  async saveAnswer(
    params: SaveSpeakingAnswerParams,
  ): Promise<void> {
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

    const {
      error: uploadError,
    } = await this.supabase.client
      .storage
      .from('speaking-audio')
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

    const {
      error: answerError,
    } = await this.supabase.client
      .from('speaking_answers')
      .upsert(
        {
          attempt_id:
            params.attemptId,
          question_id:
            params.questionId,
          audio_path:
            audioPath,
          duration_seconds:
            params.durationSeconds,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            'attempt_id,question_id',
        },
      );

    if (answerError) {
      throw new Error(
        `Não foi possível salvar a resposta: ${answerError.message}`,
      );
    }
  }

  private getExtension(
    mimeType: string,
  ): string {
    if (
      mimeType.includes('mp4')
    ) {
      return 'mp4';
    }

    if (
      mimeType.includes('ogg')
    ) {
      return 'ogg';
    }

    return 'webm';
  }
}
