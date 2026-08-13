import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';

import {
  Meta,
  Title,
} from '@angular/platform-browser';

import {
  RouterLink,
} from '@angular/router';

interface Benefit {
  icon: string;
  title: string;
  description: string;
}

interface ProcessStep {
  number: string;
  title: string;
  description: string;
}

interface TestStage {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
  ],
  templateUrl:
    './home.component.html',
  styleUrl:
    './home.component.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly title =
    inject(Title);

  private readonly meta =
    inject(Meta);

  readonly benefits:
    readonly Benefit[] = [
      {
        icon:
          'bi-person-check',
        title:
          'Avaliação completa',
        description:
          'Grammar, Listening e Speaking ajudam a construir uma visão mais ampla do seu momento com o inglês.',
      },
      {
        icon:
          'bi-signpost-split',
        title:
          'Ponto de partida mais claro',
        description:
          'Suas respostas ajudam a identificar onde você está e orientam os próximos passos do aprendizado.',
      },
      {
        icon:
          'bi-chat-heart',
        title:
          'Feito para pessoas reais',
        description:
          'A avaliação considera não apenas conhecimento, mas também sua experiência, objetivos e comunicação.',
      },
    ];

  readonly testStages:
    readonly TestStage[] = [
      {
        icon:
          'bi-journal-text',
        title:
          'Grammar',
        description:
          'Questões para observar seu domínio de estruturas, vocabulário e uso do inglês.',
      },
      {
        icon:
          'bi-headphones',
        title:
          'Listening',
        description:
          'Atividades de compreensão auditiva para avaliar como você entende o inglês falado.',
      },
      {
        icon:
          'bi-mic',
        title:
          'Speaking',
        description:
          'Gravações curtas para conhecermos sua comunicação, fluência e pronúncia.',
      },
    ];

  readonly processSteps:
    readonly ProcessStep[] = [
      {
        number: '01',
        title:
          'Conte um pouco sobre você',
        description:
          'Antes da avaliação, queremos conhecer seu histórico com o inglês, seus objetivos e suas preferências de aprendizado.',
      },
      {
        number: '02',
        title:
          'Faça sua avaliação',
        description:
          'Passe pelas etapas de Grammar, Listening e Speaking com tranquilidade. Seu progresso é salvo durante o teste.',
      },
      {
        number: '03',
        title:
          'Receba sua análise',
        description:
          'Ao concluir, suas respostas objetivas são processadas e a etapa de Speaking segue para avaliação.',
      },
    ];

  constructor() {
    this.title.setTitle(
      'Teste de Nivelamento de Inglês | FB Language Center',
    );

    this.meta.updateTag({
      name: 'description',
      content:
        'Descubra seu nível de inglês com a avaliação da FB Language Center. Teste com Grammar, Listening e Speaking em cerca de 20 minutos.',
    });
  }
}
