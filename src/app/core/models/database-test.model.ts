export type DatabaseQuestionType =
  | 'multiple_choice'
  | 'listening'
  | 'speaking';

export type DatabaseQuestionCategory =
  | 'grammar'
  | 'vocabulary'
  | 'reading'
  | 'context'
  | 'listening'
  | 'speaking';

export interface DatabaseTest {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  estimated_minutes: number | null;
  version: number;
  is_active: boolean;
}

export interface DatabaseQuestion {
  id: string;
  section_id: string;
  type: DatabaseQuestionType;
  category: DatabaseQuestionCategory;
  level: string | null;
  statement: string;
  instructions: string | null;
  audio_path: string | null;
  order_index: number;
  points: number;
  is_active: boolean;
}

export interface DatabaseQuestionOption {
  id: string;
  question_id: string;
  text: string;
  order_index: number;
}
