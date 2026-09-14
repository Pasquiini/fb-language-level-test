import {
  Injectable,
  inject,
} from '@angular/core';

import {
  SupabaseService,
} from './supabase.service';

export interface AdminStudentListItem {
  id: string;
  fullName: string;
  email: string | null;
  whatsapp: string | null;
  avatarUrl: string | null;
}

export interface AdminStudentCommunicationMessage {
  id: string;

  channel: string;
  recipientType: string;
  recipient: string;
  messageBody: string;
  status: string;

  provider: string | null;
  attemptCount: number;
  lastError: string | null;

  sentAt: string | null;
  createdAt: string;
}

export interface AdminStudentProfile {
  id: string;
  fullName: string;
  email: string | null;
  whatsapp: string | null;
  avatarUrl: string | null;
  weeklyFrequency: string | null;
  perceivedLevel: string | null;
  studyDuration: string | null;
  previousSchool: string | null;
  mainGoal: string | null;
  preferredModality: string | null;
  availabilityPeriod: string | null;
  notes: string | null;
  leadStatus: string | null;
}

export interface AdminStudentTest {
  id: string;
  status: string;

  startedAt: string;
  submittedAt: string | null;
  completedAt: string | null;

  result: AdminStudentTestResult | null;
}

export interface AdminStudentTestResult {
  id: string;

  objectiveScore: number;
  speakingScore: number | null;
  totalScore: number;
  percentage: number;

  estimatedLevel: string;

  summary: string | null;
  recommendation: string | null;
  reviewNotes: string | null;

  generatedAt: string;
}

export interface AdminStudentDetail {
  student: AdminStudentProfile;
  tests: AdminStudentTest[];
  messages: AdminStudentCommunicationMessage[];
}

interface StudentProfileRow {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
}

interface StudentExtraProfileRow {
  user_id: string;
  perceived_level: string | null;
  study_duration: string | null;
  previous_school: string | null;
  main_goal: string | null;
  preferred_modality: string | null;
  weekly_frequency: string | null;
  availability_period: string | null;
  notes: string | null;
  current_lead_status: string;
}

interface TestAttemptRow {
  id: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
  completed_at: string | null;
}

interface TestResultRow {
  id: string;
  attempt_id: string;
  objective_score: number;
  speaking_score: number | null;
  total_score: number;
  percentage: number;
  estimated_level: string;
  summary: string | null;
  recommendation: string | null;
  review_notes: string | null;
  generated_at: string;
}

interface CommunicationMessageRow {
  id: string;
  channel: string;
  recipient_type: string;
  recipient: string;
  message_body: string;
  status: string;
  provider: string | null;
  attempt_count: number;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminStudentService {
  private readonly supabase =
    inject(SupabaseService);

  async getStudents():
    Promise<AdminStudentListItem[]> {
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
          avatar_url
        `)
        .eq(
          'role',
          'student',
        )
        .order(
          'full_name',
          {
            ascending: true,
          },
        );

    if (error) {
      throw error;
    }

    const rows =
      (data ?? []) as StudentProfileRow[];

    return rows.map(
      (row) => ({
        id:
          row.id,

        fullName:
          row.full_name,

        email:
          row.email,

        whatsapp:
          row.whatsapp,

        avatarUrl:
          row.avatar_url,
      }),
    );
  }

  async getStudentDetail(
    studentId: string,
  ): Promise<AdminStudentDetail | null> {
    const [
      profileResponse,
      studentProfileResponse,
      attemptsResponse,
      messagesResponse,
    ] =
      await Promise.all([
        this.supabase.client
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            whatsapp,
            avatar_url
          `)
          .eq(
            'id',
            studentId,
          )
          .eq(
            'role',
            'student',
          )
          .maybeSingle(),

        this.supabase.client
          .from('student_profiles')
          .select(`
  user_id,
  perceived_level,
  study_duration,
  previous_school,
  main_goal,
  preferred_modality,
  weekly_frequency,
  availability_period,
  notes,
  current_lead_status
`)
          .eq(
            'user_id',
            studentId,
          )
          .maybeSingle(),

        this.supabase.client
          .from('test_attempts')
          .select(`
            id,
            status,
            started_at,
            submitted_at,
            completed_at
          `)
          .eq(
            'student_id',
            studentId,
          )
          .order(
            'started_at',
            {
              ascending: false,
            },
          ),

        this.supabase.client
          .from('communication_messages')
          .select(`
            id,
            channel,
            recipient_type,
            recipient,
            message_body,
            status,
            provider,
            attempt_count,
            last_error,
            sent_at,
            created_at
          `)
          .eq(
            'student_id',
            studentId,
          )
          .order(
            'created_at',
            {
              ascending: false,
            },
          ),
      ]);

    if (
      profileResponse.error
    ) {
      throw profileResponse.error;
    }

    if (
      studentProfileResponse.error
    ) {
      throw studentProfileResponse.error;
    }

    if (
      attemptsResponse.error
    ) {
      throw attemptsResponse.error;
    }

    if (
      messagesResponse.error
    ) {
      throw messagesResponse.error;
    }

    if (
      !profileResponse.data
    ) {
      return null;
    }

    const profile =
      profileResponse.data as
      StudentProfileRow;

    const extraProfile =
      studentProfileResponse.data as
      StudentExtraProfileRow | null;

    const attempts =
      (
        attemptsResponse.data ?? []
      ) as TestAttemptRow[];

    const messages =
      (
        messagesResponse.data ?? []
      ) as CommunicationMessageRow[];

    const attemptIds =
      attempts.map(
        (attempt) =>
          attempt.id,
      );

    let results:
      TestResultRow[] = [];

    if (
      attemptIds.length > 0
    ) {
      const {
        data,
        error,
      } =
        await this.supabase.client
          .from('test_results')
          .select(`
            id,
            attempt_id,
            objective_score,
            speaking_score,
            total_score,
            percentage,
            estimated_level,
            summary,
            recommendation,
            review_notes,
            generated_at
          `)
          .in(
            'attempt_id',
            attemptIds,
          );

      if (error) {
        throw error;
      }

      results =
        (data ?? []) as
        TestResultRow[];
    }

    const resultByAttempt =
      new Map<
        string,
        TestResultRow
      >();

    for (
      const result
      of results
    ) {
      resultByAttempt.set(
        result.attempt_id,
        result,
      );
    }

    return {
      student: {
        id:
          profile.id,

        fullName:
          profile.full_name,

        email:
          profile.email,

        whatsapp:
          profile.whatsapp,

        avatarUrl:
          profile.avatar_url,

        perceivedLevel:
          extraProfile
            ?.perceived_level
          ?? null,

        studyDuration:
          extraProfile
            ?.study_duration
          ?? null,

        previousSchool:
          extraProfile
            ?.previous_school
          ?? null,

        mainGoal:
          extraProfile
            ?.main_goal
          ?? null,

        preferredModality:
          extraProfile
            ?.preferred_modality
          ?? null,

        availabilityPeriod:
          extraProfile
            ?.availability_period
          ?? null,

        notes:
          extraProfile
            ?.notes
          ?? null,
        weeklyFrequency:
          extraProfile
            ?.weekly_frequency
          ?? null,
        leadStatus:
          extraProfile
            ?.current_lead_status
          ?? null,

      },

      tests:
        attempts.map(
          (attempt) => {
            const result =
              resultByAttempt.get(
                attempt.id,
              );

            return {
              id:
                attempt.id,

              status:
                attempt.status,

              startedAt:
                attempt.started_at,

              submittedAt:
                attempt.submitted_at,

              completedAt:
                attempt.completed_at,

              result:
                result
                  ? {
                    id:
                      result.id,

                    objectiveScore:
                      Number(
                        result.objective_score,
                      ),

                    speakingScore:
                      result.speaking_score
                        === null
                        ? null
                        : Number(
                          result.speaking_score,
                        ),

                    totalScore:
                      Number(
                        result.total_score,
                      ),

                    percentage:
                      Number(
                        result.percentage,
                      ),

                    estimatedLevel:
                      result.estimated_level,

                    summary:
                      result.summary,

                    recommendation:
                      result.recommendation,

                    reviewNotes:
                      result.review_notes,

                    generatedAt:
                      result.generated_at,
                  }
                  : null,
            };
          },
        ),

      messages:
        messages.map(
          (message) => ({
            id:
              message.id,

            channel:
              message.channel,

            recipientType:
              message.recipient_type,

            recipient:
              message.recipient,

            messageBody:
              message.message_body,

            status:
              message.status,

            provider:
              message.provider,

            attemptCount:
              message.attempt_count,

            lastError:
              message.last_error,

            sentAt:
              message.sent_at,

            createdAt:
              message.created_at,
          }),
        ),
    };
  }
}
