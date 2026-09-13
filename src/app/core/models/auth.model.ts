import {
  User,
} from '@supabase/supabase-js';

export type UserRole =
  | 'admin'
  | 'student';

export interface AuthProfile {
  id: string;
  role: UserRole;
}

export interface AuthState {
  user: User | null;
  profile: AuthProfile | null;
  initialized: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
