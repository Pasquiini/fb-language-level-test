import { PlacementLevel } from "../../shared/utils/placement-level.util";


export interface PlacementResultContent {
  level: PlacementLevel;
  title: string;
  name: string;
  paragraphs:
    readonly string[];
}

export const PLACEMENT_RESULT_CONTENT:
  Record<
    PlacementLevel,
    PlacementResultContent
  > = {

  A1: {
    level: 'A1',

    title:
      'Seu nível estimado: A1 - Beginner',

    name:
      'Beginner',

    paragraphs: [
      'Você está começando a construir sua base em inglês. Já consegue reconhecer e utilizar algumas palavras, expressões e estruturas simples do dia a dia, especialmente para falar sobre você, sua rotina e informações pessoais.',

      'Neste momento, recomendamos começar pelo nível A1.',

      'Durante essa etapa, você vai desenvolver uma base sólida de vocabulário, estruturas gramaticais essenciais, compreensão oral e comunicação para situações cotidianas.',

      'O objetivo é fazer você sair do “eu entendo algumas coisas, mas não consigo falar” para conseguir se comunicar em situações simples com mais segurança e confiança.',
    ],
  },

  A2: {
    level: 'A2',

    title:
      'Seu nível estimado: A2 - Elementary',

    name:
      'Elementary',

    paragraphs: [
      'Você já possui uma base de inglês e consegue compreender e utilizar estruturas relacionadas a situações familiares do dia a dia. Também consegue falar sobre sua rotina, experiências simples, preferências e necessidades básicas.',

      'Recomendamos que você comece pelo nível A2.',

      'A partir daqui, o foco será ampliar seu vocabulário, melhorar sua compreensão auditiva e desenvolver frases mais completas para que você consiga se comunicar com mais naturalidade em situações reais.',

      'Você já tem uma base. Agora é hora de ganhar segurança, ampliar seu repertório e começar a se comunicar com mais autonomia.',
    ],
  },

  B1: {
    level: 'B1',

    title:
      'Seu nível estimado: B1 - Intermediate',

    name:
      'Intermediate',

    paragraphs: [
      'Você já consegue compreender os principais pontos de conversas e textos sobre assuntos familiares e consegue se comunicar em diversas situações do cotidiano.',

      'Também demonstra capacidade de falar sobre experiências, planos, opiniões e acontecimentos, ainda que possa cometer alguns erros ou precisar de tempo para organizar suas ideias.',

      'Recomendamos que você comece pelo nível B1.',

      'Nesta etapa, você vai trabalhar principalmente em fluência, ampliação de vocabulário, precisão gramatical e desenvolvimento da comunicação, para conseguir expressar suas ideias com mais clareza e espontaneidade.',

      'Você já passou da fase de apenas construir frases. Agora, o objetivo é conectar ideias e se comunicar de verdade.',
    ],
  },

  B2: {
    level: 'B2',

    title:
      'Seu nível estimado: B2 - Upper-Intermediate',

    name:
      'Upper-Intermediate',

    paragraphs: [
      'Seu resultado demonstra um bom domínio das estruturas e do vocabulário trabalhados no teste. Você já consegue compreender ideias principais de textos e conversas mais complexos e se comunicar com maior fluidez sobre diferentes assuntos.',

      'Recomendamos que você comece pelo nível B2.',

      'A partir daqui, o foco será desenvolver ainda mais sua precisão, naturalidade, vocabulário e capacidade de argumentação, além de trabalhar situações mais complexas de comunicação acadêmica, profissional e cotidiana.',

      'Você já possui uma base sólida. Agora, o próximo passo é transformar esse conhecimento em uma comunicação mais natural, precisa e espontânea.',
    ],
  },
};
