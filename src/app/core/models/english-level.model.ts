export type EnglishLevelId =
  | 'beginner'
  | 'basic'
  | 'intermediate'
  | 'advanced';

export interface EnglishLevel {
  id: EnglishLevelId;
  name: string;
  minimumScore: number;
  maximumScore: number;
  description: string;
  recommendation: string;
}
