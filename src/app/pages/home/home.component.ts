import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';

import { RouterLink } from '@angular/router';

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

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  readonly benefits: readonly Benefit[] = [
    {
      icon: 'bi-lightning-charge',
      title: 'Resultado imediato',
      description:
        'Ao concluir as perguntas, você recebe uma estimativa clara do seu nível atual.',
    },
    {
      icon: 'bi-person-check',
      title: 'Avaliação personalizada',
      description:
        'O resultado considera suas respostas e apresenta uma recomendação adequada ao seu momento.',
    },
    {
      icon: 'bi-signpost-split',
      title: 'Próximo passo recomendado',
      description:
        'Descubra como continuar seus estudos de forma mais estratégica e confiante.',
    },
  ];

  readonly processSteps: readonly ProcessStep[] = [
    {
      number: '01',
      title: 'Conte um pouco sobre você',
      description:
        'Compartilhe seu objetivo com o inglês e sua preferência de modalidade.',
    },
    {
      number: '02',
      title: 'Responda ao teste',
      description:
        'Resolva 12 perguntas rápidas de vocabulário, gramática, interpretação e contexto.',
    },
    {
      number: '03',
      title: 'Descubra seu nível',
      description:
        'Receba uma estimativa inicial e uma recomendação para continuar evoluindo.',
    },
  ];
}
