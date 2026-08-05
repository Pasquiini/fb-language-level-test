import { EnglishLevel } from './english-level.model';

export interface TestResult {
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  level: EnglishLevel;
  completedAt: string;
}
