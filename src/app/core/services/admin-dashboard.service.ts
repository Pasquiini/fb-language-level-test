import {
  Injectable,
  inject,
} from '@angular/core';

import {
  SupabaseService,
} from './supabase.service';

export interface AdminDashboardStats {
  underReview: number;
  completed: number;
  totalTests: number;
  communicationIssues: number;
}

export interface AdminRecentStudent {
  id: string;
  fullName: string;
  email: string | null;
  whatsapp: string | null;
  level: string | null;
  createdAt: string;
}

export interface AdminDashboardData {
  stats: AdminDashboardStats;
  recentStudents: AdminRecentStudent[];
}

interface RecentStudentProfileRow {
  user_id: string;
  perceived_level: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AdminDashboardService {
  private readonly supabase =
    inject(SupabaseService);

  async getDashboard():
    Promise<AdminDashboardData> {
    const [
      underReview,
      completed,
      totalTests,
      communicationIssues,
      recentStudents,
    ] =
      await Promise.all([
        this.countAttemptsByStatus(
          'under_review',
        ),

        this.countAttemptsByStatus(
          'completed',
        ),

        this.countAttempts(),

        this.countCommunicationIssues(),

        this.getRecentStudents(),
      ]);

    return {
      stats: {
        underReview,
        completed,
        totalTests,
        communicationIssues,
      },

      recentStudents,
    };
  }

  private async countAttemptsByStatus(
    status: string,
  ): Promise<number> {
    const {
      count,
      error,
    } =
      await this.supabase.client
        .from(
          'test_attempts',
        )
        .select(
          'id',
          {
            count:
              'exact',

            head:
              true,
          },
        )
        .eq(
          'status',
          status,
        );

    if (error) {
      throw error;
    }

    return count ?? 0;
  }

  private async countAttempts():
    Promise<number> {
    const {
      count,
      error,
    } =
      await this.supabase.client
        .from(
          'test_attempts',
        )
        .select(
          'id',
          {
            count:
              'exact',

            head:
              true,
          },
        );

    if (error) {
      throw error;
    }

    return count ?? 0;
  }

  private async countCommunicationIssues():
    Promise<number> {
    const {
      count,
      error,
    } =
      await this.supabase.client
        .from(
          'communication_messages',
        )
        .select(
          'id',
          {
            count:
              'exact',

            head:
              true,
          },
        )
        .in(
          'status',
          [
            'pending',
            'failed',
          ],
        );

    if (error) {
      throw error;
    }

    return count ?? 0;
  }

  private async getRecentStudents():
    Promise<AdminRecentStudent[]> {
    /*
     * student_profiles.created_at já faz
     * parte do schema confirmado.
     *
     * Buscamos primeiro os alunos recentes
     * e depois seus profiles, evitando
     * depender de relacionamento implícito
     * no select do Supabase.
     */
    const {
      data:
        studentProfiles,
      error:
        studentProfilesError,
    } =
      await this.supabase.client
        .from(
          'student_profiles',
        )
        .select(`
          user_id,
          perceived_level,
          created_at
        `)
        .order(
          'created_at',
          {
            ascending:
              false,
          },
        )
        .limit(
          5,
        )
        .returns<
          RecentStudentProfileRow[]
        >();

    if (
      studentProfilesError
    ) {
      throw studentProfilesError;
    }

    if (
      !studentProfiles?.length
    ) {
      return [];
    }

    const studentIds =
      studentProfiles.map(
        (
          student,
        ) =>
          student.user_id,
      );

    const {
      data: profiles,
      error:
        profilesError,
    } =
      await this.supabase.client
        .from(
          'profiles',
        )
        .select(`
          id,
          full_name,
          email,
          whatsapp
        `)
        .in(
          'id',
          studentIds,
        )
        .returns<
          ProfileRow[]
        >();

    if (profilesError) {
      throw profilesError;
    }

    const profileMap =
      new Map(
        (
          profiles ??
          []
        ).map(
          (
            profile,
          ) => [
            profile.id,
            profile,
          ],
        ),
      );

    return studentProfiles
      .map(
        (
          student,
        ) => {
          const profile =
            profileMap.get(
              student.user_id,
            );

          if (!profile) {
            return null;
          }

          return {
            id:
              student.user_id,

            fullName:
              profile.full_name,

            email:
              profile.email,

            whatsapp:
              profile.whatsapp,

            level:
              student.perceived_level,

            createdAt:
              student.created_at,
          };
        },
      )
      .filter(
        (
          student,
        ):
          student is
            AdminRecentStudent =>
          student !== null,
      );
  }
}
