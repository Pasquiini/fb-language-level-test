insert into public.tests (
  id,
  name,
  slug,
  description,
  estimated_minutes,
  version,
  is_active
)
values (
  '10000000-0000-0000-0000-000000000001',
  'Teste de Nivelamento Geral',
  'general-placement-test',
  'Avaliação inicial de inglês da FB Language Center.',
  20,
  1,
  true
);

insert into public.test_sections (
  id,
  test_id,
  name,
  description,
  order_index
)
values
(
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Grammar & Vocabulary',
  'Questões de gramática, vocabulário e uso contextual.',
  1
),
(
  '20000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'Listening',
  'Questões de compreensão auditiva.',
  2
),
(
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  'Speaking',
  'Questões de produção oral.',
  3
);

insert into public.questions (
  id,
  section_id,
  type,
  category,
  level,
  statement,
  order_index,
  points
)
values
(
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'multiple_choice',
  'grammar',
  'beginner',
  'Choose the correct option: I ___ from Brazil.',
  1,
  1
),
(
  '30000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  'multiple_choice',
  'vocabulary',
  'beginner',
  'What is the opposite of “big”?',
  2,
  1
),
(
  '30000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000001',
  'multiple_choice',
  'grammar',
  'basic',
  'Complete the sentence: She ___ English every day.',
  3,
  1
),
(
  '30000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000003',
  'speaking',
  'speaking',
  'basic',
  'Introduce yourself and tell us why you want to improve your English.',
  1,
  5
),
(
  '30000000-0000-0000-0000-000000000005',
  '20000000-0000-0000-0000-000000000003',
  'speaking',
  'speaking',
  'intermediate',
  'Tell us about a memorable trip, experience or event in your life.',
  2,
  5
),
(
  '30000000-0000-0000-0000-000000000006',
  '20000000-0000-0000-0000-000000000003',
  'speaking',
  'speaking',
  'advanced',
  'Do you think technology has improved communication? Explain your opinion.',
  3,
  5
);

insert into public.question_options (
  question_id,
  text,
  is_correct,
  order_index
)
values
(
  '30000000-0000-0000-0000-000000000001',
  'am',
  true,
  1
),
(
  '30000000-0000-0000-0000-000000000001',
  'is',
  false,
  2
),
(
  '30000000-0000-0000-0000-000000000001',
  'are',
  false,
  3
),
(
  '30000000-0000-0000-0000-000000000001',
  'be',
  false,
  4
),
(
  '30000000-0000-0000-0000-000000000002',
  'Long',
  false,
  1
),
(
  '30000000-0000-0000-0000-000000000002',
  'Small',
  true,
  2
),
(
  '30000000-0000-0000-0000-000000000002',
  'Fast',
  false,
  3
),
(
  '30000000-0000-0000-0000-000000000002',
  'Old',
  false,
  4
),
(
  '30000000-0000-0000-0000-000000000003',
  'study',
  false,
  1
),
(
  '30000000-0000-0000-0000-000000000003',
  'studying',
  false,
  2
),
(
  '30000000-0000-0000-0000-000000000003',
  'studies',
  true,
  3
),
(
  '30000000-0000-0000-0000-000000000003',
  'studied',
  false,
  4
);
