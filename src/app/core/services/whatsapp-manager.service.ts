import {
  Injectable,
  inject,
} from '@angular/core';

import {
  FunctionsHttpError,
  FunctionsRelayError,
  FunctionsFetchError,
} from '@supabase/supabase-js';

import {
  SupabaseService,
} from './supabase.service';


export interface WhatsappInstanceStatus {
  instance: string;

  state:
    | 'open'
    | 'connecting'
    | 'close'
    | 'unknown';
}


export interface ProcessCommunicationsResult {
  success: boolean;

  processed: number;

  message?: string;

  results?: Array<{
    id: string;

    success: boolean;

    providerMessageId?:
      string | null;

    error?: string;
  }>;
}


export interface WhatsappQrCode {
  base64?: string;

  code?: string;

  pairingCode?: string;
}


export interface EnqueueCommunicationsResult {
  success: boolean;

  processed: number;

  failed?: number;

  message?: string;

  results?: Array<{
    eventId: string;

    attemptId: string;

    success: boolean;

    error?: string;

    messages?: unknown[];
  }>;
}


interface ManagerSuccessResponse {
  success?: boolean;

  data?: unknown;
}


@Injectable({
  providedIn: 'root',
})
export class WhatsappManagerService {

  private readonly supabase =
    inject(
      SupabaseService,
    );


  async getStatus():
    Promise<WhatsappInstanceStatus> {

    return this.invokeFunction<
      WhatsappInstanceStatus
    >(
      'evolution-manager',
      {
        action:
          'status',
      },
    );
  }


  async connect():
    Promise<WhatsappQrCode> {

    return this.invokeFunction<
      WhatsappQrCode
    >(
      'evolution-manager',
      {
        action:
          'connect',
      },
    );
  }


  async logout():
    Promise<ManagerSuccessResponse> {

    return this.invokeFunction<
      ManagerSuccessResponse
    >(
      'evolution-manager',
      {
        action:
          'logout',
      },
    );
  }


  async restart():
    Promise<ManagerSuccessResponse> {

    return this.invokeFunction<
      ManagerSuccessResponse
    >(
      'evolution-manager',
      {
        action:
          'restart',
      },
    );
  }


  async sendTestMessage(
    number: string,
    message: string,
  ): Promise<ManagerSuccessResponse> {

    return this.invokeFunction<
      ManagerSuccessResponse
    >(
      'evolution-manager',
      {
        action:
          'send-test',

        number,

        message,
      },
    );
  }


  async processPendingMessages():
    Promise<ProcessCommunicationsResult> {

    return this.invokeFunction<
      ProcessCommunicationsResult
    >(
      'process-communications',
      {},
    );
  }


  async enqueuePendingEvents():
    Promise<EnqueueCommunicationsResult> {

    return this.invokeFunction<
      EnqueueCommunicationsResult
    >(
      'enqueue-communications',
      {},
    );
  }


  private async invokeFunction<T>(
    functionName: string,
    body:
      Record<string, unknown>,
  ): Promise<T> {

    /*
     * Pegamos a sessão atual explicitamente.
     *
     * Isso também evita transformar erro de
     * autenticação em um erro genérico da
     * Edge Function.
     */
    const {
      data: {
        session,
      },
      error:
        sessionError,
    } =
      await this.supabase
        .client
        .auth
        .getSession();


    if (sessionError) {
      console.error(
        '[WhatsappManagerService] session:',
        sessionError,
      );

      throw new Error(
        'Não foi possível validar sua sessão.',
      );
    }


    if (!session) {
      throw new Error(
        'Sua sessão expirou. Faça login novamente.',
      );
    }


    const {
      data,
      error,
    } =
      await this.supabase
        .client
        .functions
        .invoke(
          functionName,
          {
            body,

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          },
        );


    if (error) {
      console.error(
        `[WhatsappManagerService] ${functionName}:`,
        error,
      );

      throw new Error(
        await this.extractFunctionError(
          error,
        ),
      );
    }


    if (
      data
      && typeof data === 'object'
      && 'success' in data
      && data.success === false
    ) {
      const response =
        data as {
          error?: unknown;
        };

      throw new Error(
        typeof response.error ===
          'string'
          ? response.error
          : 'A operação não pôde ser concluída.',
      );
    }


    return data as T;
  }


  private async extractFunctionError(
    error: unknown,
  ): Promise<string> {

    if (
      error instanceof
      FunctionsHttpError
    ) {
      try {
        const context =
          await error.context
            .json();

        if (
          context
          && typeof context ===
            'object'
          && 'error' in context
          && typeof context.error ===
            'string'
        ) {
          return context.error;
        }
      } catch {
        return (
          error.message
          ||
          'Erro retornado pela função.'
        );
      }
    }


    if (
      error instanceof
      FunctionsRelayError
    ) {
      return (
        error.message
        ||
        'Erro de comunicação com a função.'
      );
    }


    if (
      error instanceof
      FunctionsFetchError
    ) {
      return (
        error.message
        ||
        'Não foi possível acessar a função.'
      );
    }


    if (
      error instanceof Error
    ) {
      return error.message;
    }


    return (
      'Erro ao comunicar com o servidor.'
    );
  }
}
