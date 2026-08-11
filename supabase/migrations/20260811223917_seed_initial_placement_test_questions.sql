/*
 * FB Language Center
 * Seed inicial do English Placement Test.
 *
 * Estrutura:
 * - Grammar: 20 questões
 * - Listening: 3 questões
 * - Speaking: 3 questões
 *
 * Observações:
 * - Instruções operacionais em português.
 * - Enunciados e alternativas do teste permanecem em inglês.
 * - O transcript do Listening NÃO é armazenado nas questões.
 * - As três questões de Listening usam o mesmo arquivo de áudio.
 */

do $$
declare
  placement_test_id uuid;

  grammar_section_id uuid;
  listening_section_id uuid;
  speaking_section_id uuid;

  question_id uuid;
begin
  /*
   * Localiza o teste criado na migration anterior.
   */
  select id
  into placement_test_id
  from public.tests
  where slug = 'english-placement-test'
  order by version desc
  limit 1;

  if placement_test_id is null then
    raise exception
      'Teste english-placement-test não encontrado.';
  end if;


  /*
   * =========================================================
   * SEÇÕES
   * =========================================================
   */

  insert into public.test_sections (
    test_id,
    name,
    description,
    order_index
  )
  values (
    placement_test_id,
    'Grammar',
    'Responda às questões de gramática escolhendo uma alternativa.',
    1
  )
  returning id into grammar_section_id;


  insert into public.test_sections (
    test_id,
    name,
    description,
    order_index
  )
  values (
    placement_test_id,
    'Listening',
    'Ouça a conversa com atenção e responda às três questões. Você poderá ouvir o áudio até duas vezes.',
    2
  )
  returning id into listening_section_id;


  insert into public.test_sections (
    test_id,
    name,
    description,
    order_index
  )
  values (
    placement_test_id,
    'Speaking',
    'Grave suas respostas em inglês. Procure falar de forma natural e desenvolver suas ideias com o máximo de informações que conseguir.',
    3
  )
  returning id into speaking_section_id;


  /*
   * =========================================================
   * GRAMMAR — QUESTÃO 1
   * =========================================================
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'A1',
    'My name ___ Sarah. I''m from Brazil.',
    'Escolha a alternativa que completa corretamente a frase.',
    1,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'am', false, 1),
    (question_id, 'is', true, 2),
    (question_id, 'are', false, 3),
    (question_id, 'be', false, 4);


  /*
   * QUESTÃO 2
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'A1',
    'I usually ___ coffee in the morning.',
    'Escolha a alternativa que completa corretamente a frase.',
    2,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'drink', true, 1),
    (question_id, 'drinks', false, 2),
    (question_id, 'drinking', false, 3),
    (question_id, 'drank', false, 4);


  /*
   * QUESTÃO 3
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'A1',
    '_________ brothers and sisters do you have?',
    'Escolha a alternativa correta.',
    3,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'How', false, 1),
    (question_id, 'How much', false, 2),
    (question_id, 'How many', true, 3),
    (question_id, 'How often', false, 4);


  /*
   * QUESTÃO 4
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'A1',
    'She ___ to work by bus every day.',
    'Escolha a alternativa que completa corretamente a frase.',
    4,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'go', false, 1),
    (question_id, 'goes', true, 2),
    (question_id, 'going', false, 3),
    (question_id, 'went', false, 4);


  /*
   * QUESTÃO 5
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'A2',
    '______ to go to the movies tonight?',
    'Escolha a alternativa correta.',
    5,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'Would you like?', true, 1),
    (question_id, 'Do you like?', false, 2),
    (question_id, 'Are you like?', false, 3),
    (question_id, 'Did you like?', false, 4);


  /*
   * QUESTÃO 6
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'A2',
    'We ___ dinner when the phone rang.',
    'Escolha a alternativa que completa corretamente a frase.',
    6,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'have', false, 1),
    (question_id, 'were having', true, 2),
    (question_id, 'had', false, 3),
    (question_id, 'are having', false, 4);


  /*
   * QUESTÃO 7
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'A2',
    'You ___ park here. It''s forbidden.',
    'Escolha a alternativa que completa corretamente a frase.',
    7,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'don''t have to', false, 1),
    (question_id, 'shouldn''t', false, 2),
    (question_id, 'mustn''t', true, 3),
    (question_id, 'couldn''t', false, 4);


  /*
   * QUESTÃO 8
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'A2',
    'If it rains tomorrow, we ___ at home.',
    'Escolha a alternativa que completa corretamente a frase.',
    8,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'stay', false, 1),
    (question_id, 'stayed', false, 2),
    (question_id, 'will stay', true, 3),
    (question_id, 'would stay', false, 4);


  /*
   * QUESTÃO 9
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'B1',
    'I''ve lived in this city ___ 2019.',
    'Escolha a alternativa que completa corretamente a frase.',
    9,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'for', false, 1),
    (question_id, 'since', true, 2),
    (question_id, 'during', false, 3),
    (question_id, 'from', false, 4);


  /*
   * QUESTÃO 10
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'B1',
    'She told me that she ___ tired.',
    'Escolha a alternativa que completa corretamente a frase.',
    10,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'is', false, 1),
    (question_id, 'was', true, 2),
    (question_id, 'has', false, 3),
    (question_id, 'will', false, 4);


  /*
   * QUESTÃO 11
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'B1',
    'This is the restaurant ___ we had dinner last week.',
    'Escolha a alternativa que completa corretamente a frase.',
    11,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'who', false, 1),
    (question_id, 'where', true, 2),
    (question_id, 'which', false, 3),
    (question_id, 'what', false, 4);


  /*
   * QUESTÃO 12
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'B1',
    'If I had more free time, I ___ another language.',
    'Escolha a alternativa que completa corretamente a frase.',
    12,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'learn', false, 1),
    (question_id, 'will learn', false, 2),
    (question_id, 'would learn', true, 3),
    (question_id, 'learned', false, 4);


  /*
   * QUESTÃO 13
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'B2',
    'By the time we arrived, the meeting ___.',
    'Escolha a alternativa que completa corretamente a frase.',
    13,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'already started', false, 1),
    (question_id, 'has already started', false, 2),
    (question_id, 'had already started', true, 3),
    (question_id, 'was already starting', false, 4);


  /*
   * QUESTÃO 14
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'B2',
    'I wish I ___ more time to travel.',
    'Escolha a alternativa que completa corretamente a frase.',
    14,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'have', false, 1),
    (question_id, 'had', true, 2),
    (question_id, 'would have', false, 3),
    (question_id, 'will have', false, 4);


  /*
   * QUESTÃO 15
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'B2',
    'The new policy ___ next month.',
    'Escolha a alternativa que completa corretamente a frase.',
    15,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'introduces', false, 1),
    (question_id, 'introduced', false, 2),
    (question_id, 'will be introduced', true, 3),
    (question_id, 'has introduced', false, 4);


  /*
   * QUESTÃO 16
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'B2',
    'Despite ___ very tired, she decided to finish the project.',
    'Escolha a alternativa que completa corretamente a frase.',
    16,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'be', false, 1),
    (question_id, 'being', true, 2),
    (question_id, 'was', false, 3),
    (question_id, 'been', false, 4);


  /*
   * QUESTÃO 17
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'B1',
    'I looked everywhere for my keys, but I couldn''t find them ___.',
    'Escolha a alternativa que completa corretamente a frase.',
    17,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'someone', false, 1),
    (question_id, 'nowhere', false, 2),
    (question_id, 'anywhere', true, 3),
    (question_id, 'something', false, 4);


  /*
   * QUESTÃO 18
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'B2',
    'Have you finished your homework ___?',
    'Escolha a alternativa que completa corretamente a frase.',
    18,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'already', false, 1),
    (question_id, 'yet', true, 2),
    (question_id, 'just', false, 3),
    (question_id, 'ever', false, 4);


  /*
   * QUESTÃO 19
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'B2',
    'She has been working at this company ___ five years.',
    'Escolha a alternativa que completa corretamente a frase.',
    19,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'since', false, 1),
    (question_id, 'during', false, 2),
    (question_id, 'for', true, 3),
    (question_id, 'from', false, 4);


  /*
   * QUESTÃO 20
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    grammar_section_id,
    'multiple_choice',
    'grammar',
    'B2',
    'By the time I arrived at the station, the train ___.',
    'Escolha a alternativa que completa corretamente a frase.',
    20,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (question_id, 'leaves', false, 1),
    (question_id, 'has left', false, 2),
    (question_id, 'had left', true, 3),
    (question_id, 'was leaving', false, 4);


  /*
   * =========================================================
   * LISTENING
   *
   * IMPORTANTE:
   * O roteiro Emma/Daniel não é armazenado aqui.
   *
   * O arquivo abaixo será enviado posteriormente ao Storage.
   * As três questões utilizam o mesmo áudio.
   * =========================================================
   */


  /*
   * QUESTÃO 21
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    audio_path,
    order_index,
    points
  )
  values (
    listening_section_id,
    'listening',
    'listening',
    'A2',
    'Why did Daniel and his sister leave early on Saturday?',
    'Ouça a conversa e escolha a alternativa correta.',
    'placement-test/v1/listening-01.mp3',
    21,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (
      question_id,
      'They wanted to visit a museum.',
      false,
      1
    ),
    (
      question_id,
      'They wanted to avoid traffic.',
      true,
      2
    ),
    (
      question_id,
      'They wanted to have breakfast at the beach.',
      false,
      3
    ),
    (
      question_id,
      'They wanted to arrive before the hotel opened.',
      false,
      4
    );


  /*
   * QUESTÃO 22
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    audio_path,
    order_index,
    points
  )
  values (
    listening_section_id,
    'listening',
    'listening',
    'B1',
    'Why did Daniel and his sister visit the museum?',
    'Ouça a conversa e escolha a alternativa correta.',
    'placement-test/v1/listening-01.mp3',
    22,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (
      question_id,
      'They had planned to visit it before the trip.',
      false,
      1
    ),
    (
      question_id,
      'The hotel recommended it to them.',
      false,
      2
    ),
    (
      question_id,
      'It started raining in the afternoon.',
      true,
      3
    ),
    (
      question_id,
      'They wanted to learn about seafood.',
      false,
      4
    );


  /*
   * QUESTÃO 23
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    audio_path,
    order_index,
    points
  )
  values (
    listening_section_id,
    'listening',
    'listening',
    'B2',
    'What does Daniel suggest about the museum?',
    'Ouça a conversa e escolha a alternativa correta.',
    'placement-test/v1/listening-01.mp3',
    23,
    1
  )
  returning id into question_id;

  insert into public.question_options (
    question_id,
    text,
    is_correct,
    order_index
  )
  values
    (
      question_id,
      'He thought it would be boring.',
      false,
      1
    ),
    (
      question_id,
      'He only visited it because his sister wanted to go.',
      false,
      2
    ),
    (
      question_id,
      'He was surprised by how much he enjoyed it.',
      true,
      3
    ),
    (
      question_id,
      'He would not recommend it to other tourists.',
      false,
      4
    );


  /*
   * =========================================================
   * SPEAKING
   * =========================================================
   */


  /*
   * QUESTÃO 24
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    speaking_section_id,
    'speaking',
    'speaking',
    'A2',
    'Tell us about your daily routine. What do you usually do during the week?',
    'Grave sua resposta em inglês. Procure falar naturalmente. Tempo sugerido: de 30 a 45 segundos.',
    24,
    0
  );


  /*
   * QUESTÃO 25
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    speaking_section_id,
    'speaking',
    'speaking',
    'B1/B2',
    'Tell us about a memorable trip or experience you have had. What happened and why was it memorable?',
    'Grave sua resposta em inglês. Desenvolva sua experiência com o máximo de detalhes que conseguir. Tempo sugerido: de 45 a 60 segundos.',
    25,
    0
  );


  /*
   * QUESTÃO 26
   */

  insert into public.questions (
    section_id,
    type,
    category,
    level,
    statement,
    instructions,
    order_index,
    points
  )
  values (
    speaking_section_id,
    'speaking',
    'speaking',
    'B2/C1',
    'Do you think technology has improved the way people communicate? Why or why not? Give examples to support your opinion.',
    'Grave sua resposta em inglês. Explique sua opinião e use exemplos para justificar suas ideias. Tempo sugerido: de 60 a 90 segundos.',
    26,
    0
  );

end
$$;
