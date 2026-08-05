import { EnglishLevelId } from './english-level.model';
import { TestOption } from './test-option.model';

export type QuestionCategory =
  | 'vocabulary'
  | 'grammar'
  | 'reading'
  | 'context';

export interface TestQuestion {
  id: number;
  statement: string;
  options: readonly TestOption[];
  correctOptionId: string;
  level: EnglishLevelId;
  category: QuestionCategory;
}
