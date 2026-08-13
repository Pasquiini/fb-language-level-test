import {
  DestroyRef,
  Injectable,
  Signal,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  AuthChangeEvent,
  Session,
  User,
} from '@supabase/supabase-js';

import {
  AuthOperationResult,
  AuthProfile,
  SignInCredentials,
  UserRole,
} from '../models';

import {
  SupabaseService,
} from './supabase.service';

interface ProfileRow {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  role: UserRole;
  avatar_url: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly supabase =
    inject(SupabaseService);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly sessionState =
    signal<Session | null>(null);

  private readonly profileState =
    signal<AuthProfile | null>(null);

  private readonly initializedState =
    signal<boolean>(false);

  private readonly loadingState =
    signal<boolean>(false);

  private readonly initializationPromise:
    Promise<void>;

  readonly session: Signal<Session | null> =
    this.sessionState.asReadonly();

  readonly profile: Signal<AuthProfile | null> =
    this.profileState.asReadonly();

  readonly initialized: Signal<boolean> =
    this.initializedState.asReadonly();

  readonly loading: Signal<boolean> =
    this.loadingState.asReadonly();

  readonly user = computed<User | null>(
    () => this.sessionState()?.user ?? null,
  );

  readonly isAuthenticated = computed<boolean>(
    () => this.user() !== null,
  );

  readonly isAnonymous = computed<boolean>(
    () => this.user()?.is_anonymous === true,
  );

  readonly role = computed<UserRole | null>(
    () => this.profileState()?.role ?? null,
  );

  readonly isStudent = computed<boolean>(
    () => this.role() === 'student',
  );

  readonly isTeacher = computed<boolean>(
    () => this.role() === 'teacher',
  );

  readonly isAdmin = computed<boolean>(
    () => this.role() === 'admin',
  );

  readonly isStaff = computed<boolean>(
    () =>
      this.role() === 'teacher' ||
      this.role() === 'admin',
  );

  constructor() {
    this.initializationPromise =
      this.initialize();
  }

  async waitUntilInitialized(): Promise<void> {
    await this.initializationPromise;
  }

  async initialize(): Promise<void> {
    this.loadingState.set(true);

    try {
      const {
        data: { session },
        error,
      } =
        await this.supabase.client.auth
          .getSession();

      if (error) {
        throw error;
      }

      this.sessionState.set(
        session,
      );

      if (session?.user) {
        await this.loadProfile(
          session.user,
        );
      }

      const {
        data: { subscription },
      } =
        this.supabase.client.auth
          .onAuthStateChange(
            (
              event: AuthChangeEvent,
              changedSession:
                Session | null,
            ) => {
              this.handleAuthChange(
                event,
                changedSession,
              );
            },
          );

      this.destroyRef.onDestroy(
        () => {
          subscription.unsubscribe();
        },
      );
    } finally {
      this.initializedState.set(
        true,
      );

      this.loadingState.set(
        false,
      );
    }
  }

  async createAnonymousSession(
    fullName?: string,
  ): Promise<AuthOperationResult> {
    this.loadingState.set(true);

    try {
      if (this.user()) {
        return {
          success: true,
          message:
            'Sessão já existente.',
        };
      }

      const {
        data,
        error,
      } =
        await this.supabase.client.auth
          .signInAnonymously({
            options: fullName
              ? {
                  data: {
                    full_name:
                      fullName.trim(),
                  },
                }
              : undefined,
          });

      if (error) {
        return {
          success: false,
          message:
            error.message,
        };
      }

      this.sessionState.set(
        data.session,
      );

      if (data.user) {
        await this.loadProfile(
          data.user,
        );
      }

      return {
        success: true,
        message:
          'Sessão criada com sucesso.',
      };
    } finally {
      this.loadingState.set(
        false,
      );
    }
  }

  async signInWithPassword(
    credentials:
      SignInCredentials,
  ): Promise<AuthOperationResult> {
    this.loadingState.set(true);

    try {
      const {
        data,
        error,
      } =
        await this.supabase.client.auth
          .signInWithPassword({
            email:
              credentials.email
                .trim()
                .toLowerCase(),

            password:
              credentials.password,
          });

      if (error) {
        return {
          success: false,
          message:
            'E-mail ou senha inválidos.',
        };
      }

      this.sessionState.set(
        data.session,
      );

      if (data.user) {
        await this.loadProfile(
          data.user,
        );
      }

      return {
        success: true,
        message:
          'Login realizado com sucesso.',
      };
    } finally {
      this.loadingState.set(
        false,
      );
    }
  }

  async sendMagicLink(
    email: string,
  ): Promise<AuthOperationResult> {
    this.loadingState.set(true);

    try {
      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      const redirectUrl =
        `${window.location.origin}/aluno`;

      const {
        error,
      } =
        await this.supabase.client.auth
          .signInWithOtp({
            email:
              normalizedEmail,

            options: {
              shouldCreateUser:
                true,

              emailRedirectTo:
                redirectUrl,
            },
          });

      if (error) {
        return {
          success: false,
          message:
            error.message,
        };
      }

      return {
        success: true,
        message:
          'Enviamos um link de acesso para o seu e-mail.',
      };
    } finally {
      this.loadingState.set(
        false,
      );
    }
  }

  async attachEmailToAnonymousUser(
    email: string,
  ): Promise<AuthOperationResult> {
    const currentUser =
      this.user();

    if (!currentUser) {
      return {
        success: false,
        message:
          'Nenhuma sessão ativa foi encontrada.',
      };
    }

    if (
      !currentUser.is_anonymous
    ) {
      return {
        success: false,
        message:
          'Esta conta já possui uma identidade permanente.',
      };
    }

    this.loadingState.set(true);

    try {
      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      const {
        error,
      } =
        await this.supabase.client.auth
          .updateUser({
            email:
              normalizedEmail,
          });

      if (error) {
        return {
          success: false,
          message:
            error.message,
        };
      }

      return {
        success: true,
        message:
          'Enviamos uma confirmação para o seu e-mail.',
      };
    } finally {
      this.loadingState.set(
        false,
      );
    }
  }

  async refreshProfile(): Promise<void> {
    const currentUser =
      this.user();

    if (!currentUser) {
      this.profileState.set(
        null,
      );

      return;
    }

    await this.loadProfile(
      currentUser,
    );
  }

  async signOut(): Promise<AuthOperationResult> {
    this.loadingState.set(true);

    try {
      const {
        error,
      } =
        await this.supabase.client.auth
          .signOut();

      if (error) {
        return {
          success: false,
          message:
            error.message,
        };
      }

      this.sessionState.set(
        null,
      );

      this.profileState.set(
        null,
      );

      return {
        success: true,
        message:
          'Sessão encerrada.',
      };
    } finally {
      this.loadingState.set(
        false,
      );
    }
  }

  hasRole(
    allowedRoles:
      readonly UserRole[],
  ): boolean {
    const currentRole =
      this.role();

    return (
      currentRole !== null &&
      allowedRoles.includes(
        currentRole,
      )
    );
  }

  private handleAuthChange(
    _event:
      AuthChangeEvent,
    session:
      Session | null,
  ): void {
    this.sessionState.set(
      session,
    );

    if (!session?.user) {
      this.profileState.set(
        null,
      );

      return;
    }

    /*
     * Mantemos o callback do
     * onAuthStateChange síncrono.
     *
     * A leitura do perfil ocorre
     * em outra microtask para
     * evitar bloquear o processamento
     * interno do Auth.
     */
    queueMicrotask(
      () => {
        void this.loadProfile(
          session.user,
        );
      },
    );
  }

  private async loadProfile(
    user: User,
  ): Promise<void> {
    const {
      data,
      error,
    } =
      await this.supabase.client
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          whatsapp,
          role,
          avatar_url
        `)
        .eq(
          'id',
          user.id,
        )
        .maybeSingle<ProfileRow>();

    if (error) {
      console.error(
        'Could not load profile:',
        error.message,
      );

      this.profileState.set(
        null,
      );

      return;
    }

    if (!data) {
      this.profileState.set(
        null,
      );

      return;
    }

    this.profileState.set({
      id:
        data.id,

      fullName:
        data.full_name,

      email:
        data.email,

      whatsapp:
        data.whatsapp,

      role:
        data.role,

      avatarUrl:
        data.avatar_url,

      isAnonymous:
        user.is_anonymous ===
        true,
    });
  }
}
