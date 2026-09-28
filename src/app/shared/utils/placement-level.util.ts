export type PlacementLevel =
  | 'A1'
  | 'A2'
  | 'B1'
  | 'B2';

export interface PlacementQuestionResult {
  orderIndex: number;
  isCorrect: boolean;
}

export interface PlacementLevelBlock {
  level: PlacementLevel;

  questionNumbers:
    readonly number[];

  correctAnswers: number;
  totalQuestions: number;

  percentage: number;
}

export interface PlacementClassification {
  totalCorrect: number;
  totalQuestions: number;

  percentage: number;

  percentageLevel:
    PlacementLevel;

  blocks:
    Record<
      PlacementLevel,
      PlacementLevelBlock
    >;
}

/*
 * Regra pedagógica recebida da escola.
 *
 * TOTAL QUESTIONS = 23
 *
 * A1:
 * 1–4
 *
 * A2:
 * 5–8 + Listening 21
 *
 * B1:
 * 9–12 + Listening 22
 *
 * B2:
 * 13–16 + 18–20
 * + Listening 23
 *
 * OBS:
 * A questão 17 não foi atribuída
 * a nenhum nível na regra recebida.
 */
const LEVEL_BLOCKS:
  Record<
    PlacementLevel,
    readonly number[]
  > = {

  A1: [
    1,
    2,
    3,
    4,
  ],

  A2: [
    5,
    6,
    7,
    8,
    21,
  ],

  B1: [
    9,
    10,
    11,
    12,
    22,
  ],

  B2: [
    13,
    14,
    15,
    16,
    18,
    19,
    20,
    23,
  ],
};

const TOTAL_QUESTIONS =
  23;

export function classifyPlacementResult(
  answers:
    readonly PlacementQuestionResult[],
): PlacementClassification {

  const totalCorrect =
    answers.filter(
      answer =>
        answer.isCorrect,
    ).length;

  const percentage =
    (
      totalCorrect /
      TOTAL_QUESTIONS
    ) * 100;

  const percentageLevel =
    getPercentageLevel(
      percentage,
    );

  const blocks = {
    A1:
      calculateBlock(
        'A1',
        answers,
      ),

    A2:
      calculateBlock(
        'A2',
        answers,
      ),

    B1:
      calculateBlock(
        'B1',
        answers,
      ),

    B2:
      calculateBlock(
        'B2',
        answers,
      ),
  };

  return {
    totalCorrect,
    totalQuestions:
      TOTAL_QUESTIONS,

    percentage,

    percentageLevel,

    blocks,
  };
}

export function getPercentageLevel(
  percentage: number,
): PlacementLevel {

  /*
   * Importante:
   *
   * usamos o percentual real,
   * sem arredondar antes
   * da classificação.
   */

  if (
    percentage <= 25
  ) {
    return 'A1';
  }

  if (
    percentage <= 45
  ) {
    return 'A2';
  }

  if (
    percentage <= 65
  ) {
    return 'B1';
  }

  return 'B2';
}

function calculateBlock(
  level:
    PlacementLevel,

  answers:
    readonly PlacementQuestionResult[],
): PlacementLevelBlock {

  const questionNumbers =
    LEVEL_BLOCKS[level];

  const relevantAnswers =
    answers.filter(
      answer =>
        questionNumbers.includes(
          answer.orderIndex,
        ),
    );

  const correctAnswers =
    relevantAnswers.filter(
      answer =>
        answer.isCorrect,
    ).length;

  const totalQuestions =
    questionNumbers.length;

  const percentage =
    totalQuestions > 0
      ? (
          correctAnswers /
          totalQuestions
        ) * 100
      : 0;

  return {
    level,

    questionNumbers,

    correctAnswers,

    totalQuestions,

    percentage,
  };
}
