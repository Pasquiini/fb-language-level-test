import {
  CommonModule,
} from '@angular/common';

import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import {
  FormsModule,
} from '@angular/forms';

import {
  WhatsappInstanceStatus,
  WhatsappManagerService,
  WhatsappQrCode,
} from '../../../core/services/whatsapp-manager.service';

@Component({
  selector:
    'app-whatsapp-manager',

  standalone:
    true,

  imports: [
    CommonModule,
    FormsModule,
  ],

  templateUrl:
    './whatsapp-manager.component.html',

  styleUrl:
    './whatsapp-manager.component.scss',
})
export class WhatsappManagerComponent
  implements OnInit {

  private readonly whatsappService =
    inject(
      WhatsappManagerService,
    );

  readonly loading =
    signal(false);

  readonly error =
    signal<string | null>(
      null,
    );

  readonly success =
    signal<string | null>(
      null,
    );

  readonly processingQueue =
    signal(false);

  readonly lastProcessedCount =
    signal<number | null>(
      null,
    );

  readonly status =
    signal<
      WhatsappInstanceStatus | null
    >(null);

  readonly qrCode =
    signal<
      WhatsappQrCode | null
    >(null);

  readonly preparingQueue =
    signal(false);

  readonly lastPreparedCount =
    signal<number | null>(
      null,
    );

  testNumber = '';

  testMessage =
    'Mensagem de teste da FB Language Center.';

  async ngOnInit():
    Promise<void> {

    await this.loadStatus();
  }

  async loadStatus():
    Promise<void> {

    this.loading.set(true);

    this.clearFeedback();

    try {
      const result =
        await this.whatsappService
          .getStatus();

      this.status.set(
        result,
      );
    } catch (error) {
      this.handleError(
        error,
      );
    } finally {
      this.loading.set(false);
    }
  }

  async processQueue():
    Promise<void> {

    this.processingQueue.set(true);

    this.clearFeedback();

    try {
      const result =
        await this.whatsappService
          .processPendingMessages();

      this.lastProcessedCount.set(
        result.processed,
      );

      if (
        result.processed === 0
      ) {
        this.success.set(
          'Não há mensagens pendentes na fila.',
        );

        return;
      }

      const failed =
        result.results?.filter(
          (item) =>
            !item.success,
        ).length ?? 0;

      if (failed > 0) {
        this.success.set(
          `${result.processed} mensagem(ns) processada(s), com ${failed} falha(s).`,
        );

        return;
      }

      this.success.set(
        `${result.processed} mensagem(ns) processada(s) com sucesso.`,
      );
    } catch (error) {
      this.handleError(
        error,
      );
    } finally {
      this.processingQueue.set(false);
    }
  }

  async prepareQueue():
    Promise<void> {

    this.preparingQueue.set(
      true,
    );

    this.clearFeedback();

    try {
      const result =
        await this
          .whatsappService
          .enqueuePendingEvents();

      this.lastPreparedCount.set(
        result.processed,
      );

      if (
        result.processed === 0
      ) {
        this.success.set(
          'Não existem novos eventos aguardando preparação.',
        );

        return;
      }

      if (
        result.failed
        && result.failed > 0
      ) {
        this.error.set(
          `${result.processed} evento(s) processado(s), com ${result.failed} falha(s).`,
        );

        return;
      }

      this.success.set(
        `${result.processed} evento(s) preparado(s) para envio.`,
      );
    } catch (
    error
    ) {
      this.handleError(
        error,
      );
    } finally {
      this.preparingQueue.set(
        false,
      );
    }
  }

  async connect():
    Promise<void> {

    this.loading.set(true);

    this.clearFeedback();

    try {
      const result =
        await this.whatsappService
          .connect();

      this.qrCode.set(
        result,
      );

      this.success.set(
        'Solicitação de conexão realizada.',
      );

      await this.loadStatus();
    } catch (error) {
      this.handleError(
        error,
      );
    } finally {
      this.loading.set(false);
    }
  }

  async logout():
    Promise<void> {

    this.loading.set(true);

    this.clearFeedback();

    try {
      await this.whatsappService
        .logout();

      this.qrCode.set(null);

      this.success.set(
        'WhatsApp desconectado com sucesso.',
      );

      await this.loadStatus();
    } catch (error) {
      this.handleError(
        error,
      );
    } finally {
      this.loading.set(false);
    }
  }

  async restart():
    Promise<void> {

    this.loading.set(true);

    this.clearFeedback();

    try {
      await this.whatsappService
        .restart();

      this.success.set(
        'Instância reiniciada.',
      );

      await this.loadStatus();
    } catch (error) {
      this.handleError(
        error,
      );
    } finally {
      this.loading.set(false);
    }
  }

  async sendTest():
    Promise<void> {

    if (
      !this.testNumber.trim()
      || !this.testMessage.trim()
    ) {
      this.error.set(
        'Informe o WhatsApp e a mensagem.',
      );

      return;
    }

    this.loading.set(true);

    this.clearFeedback();

    try {
      await this.whatsappService
        .sendTestMessage(
          this.testNumber,
          this.testMessage,
        );

      this.success.set(
        'Mensagem enviada com sucesso.',
      );
    } catch (error) {
      this.handleError(
        error,
      );
    } finally {
      this.loading.set(false);
    }
  }

  get qrCodeImage():
    string | null {

    const base64 =
      this.qrCode()?.base64;

    if (!base64) {
      return null;
    }

    if (
      base64.startsWith(
        'data:image',
      )
    ) {
      return base64;
    }

    return `data:image/png;base64,${base64}`;
  }

  private clearFeedback():
    void {

    this.error.set(null);
    this.success.set(null);
  }

  private handleError(
    error: unknown,
  ): void {

    console.error(
      'WhatsappManagerComponent:',
      error,
    );

    this.success.set(null);

    this.error.set(
      error instanceof Error
        ? error.message
        : 'Erro ao comunicar com o WhatsApp.',
    );
  }
}
