export type EnglishGoal =
  | 'travel'
  | 'work'
  | 'studies'
  | 'conversation'
  | 'certification'
  | 'personal-development';

export type ClassPreference =
  | 'individual'
  | 'pair'
  | 'group'
  | 'recorded-course'
  | 'undecided';

export interface Lead {
  name: string;
  whatsapp: string;
  email: string;
  goal: EnglishGoal;
  classPreference: ClassPreference;
  createdAt: string;
}
