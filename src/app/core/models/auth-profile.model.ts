export type UserRole =
  | 'student'
  | 'teacher'
  | 'admin';

export interface AuthProfile {
  id: string;
  fullName: string;
  email: string | null;
  whatsapp: string | null;
  role: UserRole;
  avatarUrl: string | null;
  isAnonymous: boolean;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface PermanentAccountData {
  email: string;
}

export interface AuthOperationResult {
  success: boolean;
  message: string;
}
