import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';

import {
  RouterLink,
} from '@angular/router';

interface TestFeature {
  icon: string;
  label: string;
  value: string;
}

@Component({
  selector: 'app-test-introduction',
  standalone: true,
  imports: [
    RouterLink,
  ],
  templateUrl: './test-introduction.component.html',
  styleUrl: './test-introduction.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestIntroductionComponent {
  readonly testFeatures: readonly TestFeature[] = [
    {
      icon: 'bi-list-check',
      label: 'Grammar & Vocabulary',
      value: '20 questões',
    },
    {
      icon: 'bi-headphones',
      label: 'Listening',
      value: '3 atividades',
    },
    {
      icon: 'bi-mic',
      label: 'Speaking',
      value: '3 atividades',
    },
    {
      icon: 'bi-clock',
      label: 'Tempo estimado',
      value: '20 minutos',
    },
  ];
}
