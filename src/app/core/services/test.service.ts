import {
  Injectable,
  Signal,
  computed,
  signal,
} from '@angular/core';

import {
  EnglishLevel,
  EnglishLevelId,
  TestAnswer,
  TestQuestion,
  TestResult,
} from '../models';

import { STORAGE_KEYS } from '../constants/app.constants';

interface StoredTestProgress {
  answers: TestAnswer[];
  currentQuestionIndex: number;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class TestService {
  private readonly questionsData: readonly TestQuestion[] = [
    {
      id: 1,
      statement: 'Choose the correct option: I ___ from Brazil.',
      options: [
        {
          id: 'a',
          text: 'am',
        },
        {
          id: 'b',
          text: 'is',
        },
        {
          id: 'c',
          text: 'are',
        },
        {
          id: 'd',
          text: 'be',
        },
      ],
      correctOptionId: 'a',
      level: 'beginner',
      category: 'grammar',
    },
    {
      id: 2,
      statement: 'What is the opposite of “big”?',
      options: [
        {
          id: 'a',
          text: 'Long',
        },
        {
          id: 'b',
          text: 'Small',
        },
        {
          id: 'c',
          text: 'Fast',
        },
        {
          id: 'd',
          text: 'Old',
        },
      ],
      correctOptionId: 'b',
      level: 'beginner',
      category: 'vocabulary',
    },
    {
      id: 3,
      statement: 'Complete the sentence: She ___ English every day.',
      options: [
        {
          id: 'a',
          text: 'study',
        },
        {
          id: 'b',
          text: 'studying',
        },
        {
          id: 'c',
          text: 'studies',
        },
        {
          id: 'd',
          text: 'studied',
        },
      ],
      correctOptionId: 'c',
      level: 'beginner',
      category: 'grammar',
    },
    {
      id: 4,
      statement: 'Choose the correct sentence.',
      options: [
        {
          id: 'a',
          text: 'There is two books on the table.',
        },
        {
          id: 'b',
          text: 'There are two books on the table.',
        },
        {
          id: 'c',
          text: 'There be two books on the table.',
        },
        {
          id: 'd',
          text: 'There have two books on the table.',
        },
      ],
      correctOptionId: 'b',
      level: 'basic',
      category: 'grammar',
    },
    {
      id: 5,
      statement:
        'You are at a restaurant and want to ask for the menu. What should you say?',
      options: [
        {
          id: 'a',
          text: 'Can I have the menu, please?',
        },
        {
          id: 'b',
          text: 'I am the menu.',
        },
        {
          id: 'c',
          text: 'Where menu go?',
        },
        {
          id: 'd',
          text: 'Give menu yesterday.',
        },
      ],
      correctOptionId: 'a',
      level: 'basic',
      category: 'context',
    },
    {
      id: 6,
      statement:
        'Read the sentence: “Emma missed the bus, so she arrived late.” Why did Emma arrive late?',
      options: [
        {
          id: 'a',
          text: 'She woke up early.',
        },
        {
          id: 'b',
          text: 'She missed the bus.',
        },
        {
          id: 'c',
          text: 'She finished work.',
        },
        {
          id: 'd',
          text: 'She walked to the park.',
        },
      ],
      correctOptionId: 'b',
      level: 'basic',
      category: 'reading',
    },
    {
      id: 7,
      statement:
        'Complete the sentence: If it rains tomorrow, we ___ at home.',
      options: [
        {
          id: 'a',
          text: 'stay',
        },
        {
          id: 'b',
          text: 'stayed',
        },
        {
          id: 'c',
          text: 'will stay',
        },
        {
          id: 'd',
          text: 'have stayed',
        },
      ],
      correctOptionId: 'c',
      level: 'intermediate',
      category: 'grammar',
    },
    {
      id: 8,
      statement: 'What does the expression “I’m looking forward to it” mean?',
      options: [
        {
          id: 'a',
          text: 'I am worried about it.',
        },
        {
          id: 'b',
          text: 'I am excited about something that will happen.',
        },
        {
          id: 'c',
          text: 'I cannot see it.',
        },
        {
          id: 'd',
          text: 'I want to cancel it.',
        },
      ],
      correctOptionId: 'b',
      level: 'intermediate',
      category: 'vocabulary',
    },
    {
      id: 9,
      statement:
        'Read the sentence: “Although the project was challenging, the team completed it ahead of schedule.” What happened?',
      options: [
        {
          id: 'a',
          text: 'The project was cancelled.',
        },
        {
          id: 'b',
          text: 'The team completed the project late.',
        },
        {
          id: 'c',
          text: 'The team completed the project earlier than expected.',
        },
        {
          id: 'd',
          text: 'The project was easy.',
        },
      ],
      correctOptionId: 'c',
      level: 'intermediate',
      category: 'reading',
    },
    {
      id: 10,
      statement:
        'Choose the option that best completes the sentence: By the time we arrived, the meeting ___.',
      options: [
        {
          id: 'a',
          text: 'has already started',
        },
        {
          id: 'b',
          text: 'had already started',
        },
        {
          id: 'c',
          text: 'already starts',
        },
        {
          id: 'd',
          text: 'will already start',
        },
      ],
      correctOptionId: 'b',
      level: 'advanced',
      category: 'grammar',
    },
    {
      id: 11,
      statement:
        'What does “to address an issue” most likely mean in a professional context?',
      options: [
        {
          id: 'a',
          text: 'To ignore a problem.',
        },
        {
          id: 'b',
          text: 'To create a postal address.',
        },
        {
          id: 'c',
          text: 'To discuss or deal with a problem.',
        },
        {
          id: 'd',
          text: 'To postpone a meeting permanently.',
        },
      ],
      correctOptionId: 'c',
      level: 'advanced',
      category: 'context',
    },
    {
      id: 12,
      statement:
        'Choose the sentence that expresses a hypothetical past situation correctly.',
      options: [
        {
          id: 'a',
          text: 'If I knew about the event, I will attend.',
        },
        {
          id: 'b',
          text: 'If I had known about the event, I would have attended.',
        },
        {
          id: 'c',
          text: 'If I know about the event, I would attended.',
        },
        {
          id: 'd',
          text: 'If I had know about the event, I attended.',
        },
      ],
      correctOptionId: 'b',
      level: 'advanced',
      category: 'grammar',
    },
  ];

  private readonly levels: readonly EnglishLevel[] = [
    {
      id: 'beginner',
      name: 'Iniciante',
      minimumScore: 0,
      maximumScore: 3,
      description:
        'Você está começando a construir sua base no inglês e já pode desenvolver vocabulário, compreensão e segurança para situações simples do dia a dia.',
      recommendation:
        'Um plano inicial com foco em vocabulário essencial, estruturas básicas e prática guiada ajudará você a avançar com confiança.',
    },
    {
      id: 'basic',
      name: 'Básico',
      minimumScore: 4,
      maximumScore: 6,
      description:
        'Você já reconhece estruturas frequentes e consegue compreender expressões comuns em situações conhecidas.',
      recommendation:
        'Aulas com prática de conversação, ampliação de vocabulário e consolidação gramatical ajudarão você a ganhar mais autonomia.',
    },
    {
      id: 'intermediate',
      name: 'Intermediário',
      minimumScore: 7,
      maximumScore: 9,
      description:
        'Você já compreende situações frequentes, consegue participar de conversas e possui uma boa base para evoluir em fluência e naturalidade.',
      recommendation:
        'Uma aula experimental ajudará a identificar seus pontos fortes e construir um plano personalizado para desenvolver fluência.',
    },
    {
      id: 'advanced',
      name: 'Avançado',
      minimumScore: 10,
      maximumScore: 12,
      description:
        'Você demonstra domínio consistente de estruturas complexas, boa compreensão contextual e capacidade para se comunicar com precisão.',
      recommendation:
        'Um plano avançado pode refinar sua naturalidade, pronúncia, vocabulário especializado e comunicação em contextos acadêmicos ou profissionais.',
    },
  ];

  private readonly answersState = signal<readonly TestAnswer[]>([]);
  private readonly currentQuestionIndexState = signal<number>(0);

  readonly questions: readonly TestQuestion[] = this.questionsData;
  readonly answers: Signal<readonly TestAnswer[]> =
    this.answersState.asReadonly();

  readonly currentQuestionIndex: Signal<number> =
    this.currentQuestionIndexState.asReadonly();

  readonly totalQuestions = this.questionsData.length;

  readonly answeredQuestions = computed<number>(
    () => this.answersState().length,
  );

  readonly progressPercentage = computed<number>(() => {
    if (this.totalQuestions === 0) {
      return 0;
    }

    return Math.round(
      (this.answeredQuestions() / this.totalQuestions) * 100,
    );
  });

  readonly currentQuestion = computed<TestQuestion | null>(() => {
    return this.questionsData[this.currentQuestionIndexState()] ?? null;
  });

  readonly canGoPrevious = computed<boolean>(
    () => this.currentQuestionIndexState() > 0,
  );

  readonly canGoNext = computed<boolean>(() => {
    return (
      this.currentQuestionIndexState() <
      this.totalQuestions - 1
    );
  });

  readonly currentAnswer = computed<TestAnswer | null>(() => {
    const question = this.currentQuestion();

    if (!question) {
      return null;
    }

    return this.getAnswerForQuestion(question.id);
  });

  constructor() {
    this.loadProgress();
  }

  registerAnswer(
    questionId: number,
    selectedOptionId: string,
  ): void {
    const question = this.getQuestionById(questionId);

    if (!question) {
      return;
    }

    const optionExists = question.options.some(
      (option) => option.id === selectedOptionId,
    );

    if (!optionExists) {
      return;
    }

    this.answersState.update((answers) => {
      const existingAnswerIndex = answers.findIndex(
        (answer) => answer.questionId === questionId,
      );

      const newAnswer: TestAnswer = {
        questionId,
        selectedOptionId,
      };

      if (existingAnswerIndex === -1) {
        return [...answers, newAnswer];
      }

      return answers.map((answer) =>
        answer.questionId === questionId
          ? newAnswer
          : answer,
      );
    });

    this.saveProgress();
  }

  getAnswerForQuestion(questionId: number): TestAnswer | null {
    return (
      this.answersState().find(
        (answer) => answer.questionId === questionId,
      ) ?? null
    );
  }

  isQuestionAnswered(questionId: number): boolean {
    return this.getAnswerForQuestion(questionId) !== null;
  }

  goToQuestion(index: number): void {
    const normalizedIndex = Math.min(
      Math.max(index, 0),
      this.totalQuestions - 1,
    );

    this.currentQuestionIndexState.set(normalizedIndex);
    this.saveProgress();
  }

  goToNextQuestion(): void {
    if (!this.canGoNext()) {
      return;
    }

    this.currentQuestionIndexState.update(
      (currentIndex) => currentIndex + 1,
    );

    this.saveProgress();
  }

  goToPreviousQuestion(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    this.currentQuestionIndexState.update(
      (currentIndex) => currentIndex - 1,
    );

    this.saveProgress();
  }

  calculateScore(): number {
    return this.answersState().reduce(
      (score, answer) => {
        const question = this.getQuestionById(
          answer.questionId,
        );

        if (
          question &&
          question.correctOptionId === answer.selectedOptionId
        ) {
          return score + 1;
        }

        return score;
      },
      0,
    );
  }

  calculatePercentage(score: number = this.calculateScore()): number {
    if (this.totalQuestions === 0) {
      return 0;
    }

    return Math.round((score / this.totalQuestions) * 100);
  }

  determineLevel(score: number): EnglishLevel {
    const normalizedScore = Math.min(
      Math.max(score, 0),
      this.totalQuestions,
    );

    return (
      this.levels.find(
        (level) =>
          normalizedScore >= level.minimumScore &&
          normalizedScore <= level.maximumScore,
      ) ?? this.levels[0]
    );
  }

  buildResult(): TestResult {
    const correctAnswers = this.calculateScore();
    const percentage =
      this.calculatePercentage(correctAnswers);
    const level = this.determineLevel(correctAnswers);

    const result: TestResult = {
      correctAnswers,
      totalQuestions: this.totalQuestions,
      percentage,
      level,
      completedAt: new Date().toISOString(),
    };

    this.saveResult(result);

    return result;
  }

  getStoredResult(): TestResult | null {
    const storedValue = this.getStorageItem(
      STORAGE_KEYS.testResult,
    );

    if (!storedValue) {
      return null;
    }

    try {
      const parsedValue: unknown = JSON.parse(storedValue);

      if (!this.isTestResult(parsedValue)) {
        return null;
      }

      return parsedValue;
    } catch {
      return null;
    }
  }

  saveProgress(): void {
    const progress: StoredTestProgress = {
      answers: [...this.answersState()],
      currentQuestionIndex:
        this.currentQuestionIndexState(),
      updatedAt: new Date().toISOString(),
    };

    this.setStorageItem(
      STORAGE_KEYS.testProgress,
      JSON.stringify(progress),
    );
  }

  loadProgress(): void {
    const storedValue = this.getStorageItem(
      STORAGE_KEYS.testProgress,
    );

    if (!storedValue) {
      return;
    }

    try {
      const parsedValue: unknown = JSON.parse(storedValue);

      if (!this.isStoredTestProgress(parsedValue)) {
        this.removeStorageItem(STORAGE_KEYS.testProgress);
        return;
      }

      const validAnswers = parsedValue.answers.filter(
        (answer) => {
          const question = this.getQuestionById(
            answer.questionId,
          );

          return question?.options.some(
            (option) =>
              option.id === answer.selectedOptionId,
          );
        },
      );

      this.answersState.set(validAnswers);

      const normalizedIndex = Math.min(
        Math.max(parsedValue.currentQuestionIndex, 0),
        this.totalQuestions - 1,
      );

      this.currentQuestionIndexState.set(normalizedIndex);
    } catch {
      this.removeStorageItem(STORAGE_KEYS.testProgress);
    }
  }

  resetTest(): void {
    this.answersState.set([]);
    this.currentQuestionIndexState.set(0);

    this.removeStorageItem(STORAGE_KEYS.testProgress);
    this.removeStorageItem(STORAGE_KEYS.testResult);
  }

  private getQuestionById(
    questionId: number,
  ): TestQuestion | undefined {
    return this.questionsData.find(
      (question) => question.id === questionId,
    );
  }

  private saveResult(result: TestResult): void {
    this.setStorageItem(
      STORAGE_KEYS.testResult,
      JSON.stringify(result),
    );
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
    return typeof window !== 'undefined' &&
      typeof localStorage !== 'undefined';
  }

  private isStoredTestProgress(
    value: unknown,
  ): value is StoredTestProgress {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      Array.isArray(value['answers']) &&
      value['answers'].every((answer) =>
        this.isTestAnswer(answer),
      ) &&
      typeof value['currentQuestionIndex'] === 'number' &&
      Number.isInteger(value['currentQuestionIndex']) &&
      typeof value['updatedAt'] === 'string'
    );
  }

  private isTestAnswer(value: unknown): value is TestAnswer {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['questionId'] === 'number' &&
      Number.isInteger(value['questionId']) &&
      typeof value['selectedOptionId'] === 'string'
    );
  }

  private isTestResult(value: unknown): value is TestResult {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['correctAnswers'] === 'number' &&
      typeof value['totalQuestions'] === 'number' &&
      typeof value['percentage'] === 'number' &&
      typeof value['completedAt'] === 'string' &&
      this.isEnglishLevel(value['level'])
    );
  }

  private isEnglishLevel(
    value: unknown,
  ): value is EnglishLevel {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isEnglishLevelId(value['id']) &&
      typeof value['name'] === 'string' &&
      typeof value['minimumScore'] === 'number' &&
      typeof value['maximumScore'] === 'number' &&
      typeof value['description'] === 'string' &&
      typeof value['recommendation'] === 'string'
    );
  }

  private isEnglishLevelId(
    value: unknown,
  ): value is EnglishLevelId {
    return (
      value === 'beginner' ||
      value === 'basic' ||
      value === 'intermediate' ||
      value === 'advanced'
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
