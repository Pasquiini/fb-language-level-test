import {
  Injectable,
  Signal,
  signal,
} from '@angular/core';

import {
  ClassPreference,
  EnglishGoal,
  Lead,
  TestResult,
} from '../models';
import { STORAGE_KEYS, WHATSAPP_CONFIG } from '../constants/app.constants';


export interface LeadSubmission {
  lead: Lead;
  result: TestResult;
  submittedAt: string;
  status: 'simulated';
}

@Injectable({
  providedIn: 'root',
})
export class LeadService {
  private readonly leadState = signal<Lead | null>(null);

  readonly lead: Signal<Lead | null> =
    this.leadState.asReadonly();

  readonly goalLabels: Readonly<
    Record<EnglishGoal, string>
  > = {
    travel: 'Viagens',
    work: 'Trabalho',
    studies: 'Estudos',
    conversation: 'Conversação',
    certification: 'Prova ou certificação',
    'personal-development': 'Desenvolvimento pessoal',
  };

  readonly classPreferenceLabels: Readonly<
    Record<ClassPreference, string>
  > = {
    individual: 'Aula individual',
    pair: 'Aula em dupla',
    group: 'Aula em grupo',
    'recorded-course': 'Curso gravado',
    undecided: 'Ainda não sei',
  };

  constructor() {
    this.loadLead();
  }

  saveLead(lead: Lead): void {
    const normalizedLead: Lead = {
      name: lead.name.trim(),
      whatsapp: this.normalizePhoneNumber(
        lead.whatsapp,
      ),
      email: lead.email.trim().toLowerCase(),
      goal: lead.goal,
      classPreference: lead.classPreference,
      createdAt: lead.createdAt,
    };

    this.leadState.set(normalizedLead);

    this.setStorageItem(
      STORAGE_KEYS.lead,
      JSON.stringify(normalizedLead),
    );
  }

  getLead(): Lead | null {
    return this.leadState();
  }

  loadLead(): Lead | null {
    const storedValue = this.getStorageItem(
      STORAGE_KEYS.lead,
    );

    if (!storedValue) {
      return null;
    }

    try {
      const parsedValue: unknown = JSON.parse(storedValue);

      if (!this.isLead(parsedValue)) {
        this.removeStorageItem(STORAGE_KEYS.lead);
        return null;
      }

      this.leadState.set(parsedValue);

      return parsedValue;
    } catch {
      this.removeStorageItem(STORAGE_KEYS.lead);
      return null;
    }
  }

  clearLead(): void {
    this.leadState.set(null);
    this.removeStorageItem(STORAGE_KEYS.lead);
    this.removeStorageItem(STORAGE_KEYS.leadSubmission);
  }

  getGoalLabel(goal: EnglishGoal): string {
    return this.goalLabels[goal];
  }

  getClassPreferenceLabel(
    preference: ClassPreference,
  ): string {
    return this.classPreferenceLabels[preference];
  }

  buildWhatsappMessage(
    result: TestResult,
    lead: Lead | null = this.leadState(),
  ): string {
    if (!lead) {
      return [
        'Olá!',
        '',
        'Acabei de realizar o teste de nivelamento da FB Language Center.',
        '',
        `Meu nível estimado foi ${result.level.name}, com ${result.correctAnswers} acertos de ${result.totalQuestions} questões.`,
        '',
        'Gostaria de receber mais informações sobre as aulas.',
      ].join('\n');
    }

    const goalLabel = this.getGoalLabel(lead.goal);
    const preferenceLabel =
      this.getClassPreferenceLabel(
        lead.classPreference,
      );

    return [
      `Olá! Meu nome é ${lead.name}.`,
      '',
      'Acabei de realizar o teste de nivelamento da FB Language Center.',
      '',
      `Meu nível estimado foi ${result.level.name}, com ${result.correctAnswers} acertos de ${result.totalQuestions} questões.`,
      '',
      `Meu principal objetivo com o inglês é ${goalLabel.toLowerCase()}.`,
      '',
      `Minha preferência de modalidade é ${preferenceLabel.toLowerCase()}.`,
      '',
      'Gostaria de receber mais informações sobre as aulas.',
    ].join('\n');
  }

  buildWhatsappUrl(
    result: TestResult,
    lead: Lead | null = this.leadState(),
  ): string {
    const message = this.buildWhatsappMessage(
      result,
      lead,
    );

    const encodedMessage = encodeURIComponent(message);

    return `${WHATSAPP_CONFIG.baseUrl}/${WHATSAPP_CONFIG.phoneNumber}?text=${encodedMessage}`;
  }

  simulateSubmission(
    result: TestResult,
  ): Promise<LeadSubmission> {
    const currentLead = this.leadState();

    if (!currentLead) {
      return Promise.reject(
        new Error(
          'Os dados do interessado não foram encontrados.',
        ),
      );
    }

    const submission: LeadSubmission = {
      lead: currentLead,
      result,
      submittedAt: new Date().toISOString(),
      status: 'simulated',
    };

    return new Promise<LeadSubmission>((resolve) => {
      window.setTimeout(() => {
        this.setStorageItem(
          STORAGE_KEYS.leadSubmission,
          JSON.stringify(submission),
        );

        resolve(submission);
      }, 900);
    });
  }

  getStoredSubmission(): LeadSubmission | null {
    const storedValue = this.getStorageItem(
      STORAGE_KEYS.leadSubmission,
    );

    if (!storedValue) {
      return null;
    }

    try {
      const parsedValue: unknown = JSON.parse(storedValue);

      if (!this.isLeadSubmission(parsedValue)) {
        return null;
      }

      return parsedValue;
    } catch {
      return null;
    }
  }

  private normalizePhoneNumber(
    phoneNumber: string,
  ): string {
    return phoneNumber.replace(/\D/g, '');
  }

  private getStorageItem(key: string): string | null {
    if (!this.isLocalStorageAvailable()) {
      return null;
    }

    return localStorage.getItem(key);
  }

  private setStorageItem(key: string, value: string): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    localStorage.setItem(key, value);
  }

  private removeStorageItem(key: string): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    localStorage.removeItem(key);
  }

  private isLocalStorageAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof localStorage !== 'undefined'
    );
  }

  private isLead(value: unknown): value is Lead {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['name'] === 'string' &&
      typeof value['whatsapp'] === 'string' &&
      typeof value['email'] === 'string' &&
      this.isEnglishGoal(value['goal']) &&
      this.isClassPreference(
        value['classPreference'],
      ) &&
      typeof value['createdAt'] === 'string'
    );
  }

  private isLeadSubmission(
    value: unknown,
  ): value is LeadSubmission {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isLead(value['lead']) &&
      this.isTestResult(value['result']) &&
      typeof value['submittedAt'] === 'string' &&
      value['status'] === 'simulated'
    );
  }

  private isTestResult(
    value: unknown,
  ): value is TestResult {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['correctAnswers'] === 'number' &&
      typeof value['totalQuestions'] === 'number' &&
      typeof value['percentage'] === 'number' &&
      typeof value['completedAt'] === 'string' &&
      this.isRecord(value['level']) &&
      typeof value['level']['id'] === 'string' &&
      typeof value['level']['name'] === 'string' &&
      typeof value['level']['minimumScore'] === 'number' &&
      typeof value['level']['maximumScore'] === 'number' &&
      typeof value['level']['description'] === 'string' &&
      typeof value['level']['recommendation'] === 'string'
    );
  }

  private isEnglishGoal(
    value: unknown,
  ): value is EnglishGoal {
    return (
      value === 'travel' ||
      value === 'work' ||
      value === 'studies' ||
      value === 'conversation' ||
      value === 'certification' ||
      value === 'personal-development'
    );
  }

  private isClassPreference(
    value: unknown,
  ): value is ClassPreference {
    return (
      value === 'individual' ||
      value === 'pair' ||
      value === 'group' ||
      value === 'recorded-course' ||
      value === 'undecided'
    );
  }

  private isRecord(
    value: unknown,
  ): value is Record<string, unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    );
  }
}
