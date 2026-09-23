-- ============================================================
-- FB Language Center
-- Migration: create_admin_attempt_answer_breakdown
--
-- Purpose:
--   Allow staff users to inspect:
--   1. objective test performance grouped by category
--   2. every objective question answered by the student
--   3. selected and correct alternatives
--
-- Notes:
--   - Speaking is intentionally excluded from the objective
--     breakdown because it has its own review/scoring flow.
--   - The function is restricted to teacher/admin users.
-- ============================================================

begin;


-- ============================================================
-- 1. Admin attempt answer breakdown
-- ============================================================

create or replace function public.get_admin_attempt_answer_breakdown(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_attempt
    public.test_attempts%rowtype;

  v_summary
    jsonb;

  v_answers
    jsonb;

begin

  -- ==========================================================
  -- 1. Validate input
  -- ==========================================================

  if p_attempt_id is null then
    raise exception
      'attempt_id é obrigatório'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- 2. Authorization
  -- ==========================================================

  if not coalesce(
    public.is_staff(),
    false
  ) then

    raise exception
      'Acesso não autorizado'
      using errcode = '42501';

  end if;


  -- ==========================================================
  -- 3. Load attempt
  -- ==========================================================

  select
    ta.*
  into
    v_attempt
  from
    public.test_attempts ta
  where
    ta.id = p_attempt_id;


  if not found then
    raise exception
      'Tentativa não encontrada'
      using errcode = 'P0002';
  end if;


  -- ==========================================================
  -- 4. Performance grouped by category
  -- ==========================================================
  --
  -- Every objective question belonging to the test is counted.
  --
  -- Correct:
  --   selected_option.is_correct = true
  --
  -- Incorrect:
  --   question answered, but selected option is not correct
  --
  -- Unanswered:
  --   no selected option
  --
  -- Speaking questions are handled separately and therefore
  -- excluded here.
  -- ==========================================================

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'category',
          category_data.category,

          'correct',
          category_data.correct_count,

          'incorrect',
          category_data.incorrect_count,

          'unanswered',
          category_data.unanswered_count,

          'answered',
          category_data.answered_count,

          'total',
          category_data.total_count,

          'percentage',
          category_data.percentage
        )
        order by
          category_data.category_order
      ),
      '[]'::jsonb
    )
  into
    v_summary
  from (

    select

      q.category::text
        as category,

      case q.category::text
        when 'grammar' then 1
        when 'vocabulary' then 2
        when 'reading' then 3
        when 'context' then 4
        when 'listening' then 5
        else 99
      end
        as category_order,

      count(*) filter (
        where selected_option.is_correct = true
      )::integer
        as correct_count,

      count(*) filter (
        where answer.id is not null
          and answer.selected_option_id is not null
          and coalesce(
            selected_option.is_correct,
            false
          ) = false
      )::integer
        as incorrect_count,

      count(*) filter (
        where answer.id is null
           or answer.selected_option_id is null
      )::integer
        as unanswered_count,

      count(*) filter (
        where answer.id is not null
          and answer.selected_option_id is not null
      )::integer
        as answered_count,

      count(*)::integer
        as total_count,

      round(
        (
          count(*) filter (
            where selected_option.is_correct = true
          )::numeric
          /
          nullif(
            count(*)::numeric,
            0
          )
        ) * 100,
        2
      )
        as percentage

    from
      public.test_sections section

    join
      public.questions q
        on q.section_id = section.id

    left join
      public.test_answers answer
        on answer.attempt_id = v_attempt.id
       and answer.question_id = q.id

    left join
      public.question_options selected_option
        on selected_option.id =
          answer.selected_option_id

    where
      section.test_id = v_attempt.test_id

      and q.type <> 'speaking'

    group by
      q.category

  ) category_data;


  -- ==========================================================
  -- 5. Individual objective questions
  -- ==========================================================

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(

          'questionId',
          question_data.question_id,

          'sectionId',
          question_data.section_id,

          'sectionName',
          question_data.section_name,

          'sectionOrder',
          question_data.section_order,

          'questionOrder',
          question_data.question_order,

          'category',
          question_data.category,

          'type',
          question_data.question_type,

          'level',
          question_data.level,

          'statement',
          question_data.statement,

          'instructions',
          question_data.instructions,

          'audioPath',
          question_data.audio_path,

          'points',
          question_data.points,

          'answerId',
          question_data.answer_id,

          'selectedOptionId',
          question_data.selected_option_id,

          'selectedOptionText',
          question_data.selected_option_text,

          'correctOptionId',
          question_data.correct_option_id,

          'correctOptionText',
          question_data.correct_option_text,

          'isCorrect',
          question_data.is_correct,

          'awardedPoints',
          question_data.awarded_points,

          'answeredAt',
          question_data.answered_at,

          'options',
          question_data.options

        )
        order by
          question_data.section_order,
          question_data.question_order
      ),
      '[]'::jsonb
    )
  into
    v_answers
  from (

    select

      q.id
        as question_id,

      section.id
        as section_id,

      section.name
        as section_name,

      section.order_index
        as section_order,

      q.order_index
        as question_order,

      q.category::text
        as category,

      q.type::text
        as question_type,

      q.level,

      q.statement,

      q.instructions,

      q.audio_path,

      q.points,

      answer.id
        as answer_id,

      answer.selected_option_id,

      selected_option.text
        as selected_option_text,

      correct_option.id
        as correct_option_id,

      correct_option.text
        as correct_option_text,

      case

        when answer.selected_option_id is null
          then null

        else
          coalesce(
            selected_option.is_correct,
            false
          )

      end
        as is_correct,

      answer.awarded_points,

      answer.answered_at,

      (
        select
          coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id',
                option_item.id,

                'text',
                option_item.text,

                'order',
                option_item.order_index,

                'isCorrect',
                option_item.is_correct,

                'isSelected',
                (
                  option_item.id =
                  answer.selected_option_id
                )
              )
              order by
                option_item.order_index
            ),
            '[]'::jsonb
          )
        from
          public.question_options option_item
        where
          option_item.question_id = q.id
      )
        as options

    from
      public.test_sections section

    join
      public.questions q
        on q.section_id = section.id

    left join
      public.test_answers answer
        on answer.attempt_id = v_attempt.id
       and answer.question_id = q.id

    left join
      public.question_options selected_option
        on selected_option.id =
          answer.selected_option_id

    left join lateral (

      select
        qo.id,
        qo.text

      from
        public.question_options qo

      where
        qo.question_id = q.id
        and qo.is_correct = true

      order by
        qo.order_index

      limit 1

    ) correct_option
      on true

    where
      section.test_id = v_attempt.test_id

      and q.type <> 'speaking'

  ) question_data;


  -- ==========================================================
  -- 6. Final payload
  -- ==========================================================

  return jsonb_build_object(

    'attemptId',
    v_attempt.id,

    'testId',
    v_attempt.test_id,

    'studentId',
    v_attempt.student_id,

    'status',
    v_attempt.status,

    'startedAt',
    v_attempt.started_at,

    'submittedAt',
    v_attempt.submitted_at,

    'completedAt',
    v_attempt.completed_at,

    'summary',
    v_summary,

    'answers',
    v_answers

  );

end;
$$;


-- ============================================================
-- 2. Permissions
-- ============================================================

revoke all
on function public.get_admin_attempt_answer_breakdown(uuid)
from public;

revoke all
on function public.get_admin_attempt_answer_breakdown(uuid)
from anon;

grant execute
on function public.get_admin_attempt_answer_breakdown(uuid)
to authenticated;


comment on function
  public.get_admin_attempt_answer_breakdown(uuid)
is
  'Returns objective test performance by category and detailed answers for a test attempt. Restricted internally to staff users.';


commit;
