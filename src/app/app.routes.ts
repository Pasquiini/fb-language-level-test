import {
  Routes,
} from '@angular/router';

import {
  testAttemptGuard,
} from './core/guards/test-attempt.guard';

export const routes: Routes = [
  {
    path: '',

    title:
      'FB Language Center | Teste de Nivelamento',

    loadComponent: () =>
      import(
        './pages/home/home.component'
      ).then(
        (component) =>
          component.Home,
      ),
  },

  {
    path:
      'teste',

    title:
      'Teste de Nivelamento | FB Language Center',

    loadComponent: () =>
      import(
        './pages/test-introduction/test-introduction.component'
      ).then(
        (component) =>
          component.TestIntroductionComponent,
      ),
  },

  {
    path:
      'teste/dados',

    title:
      'Seus dados | Teste de Nivelamento | FB Language Center',

    loadComponent: () =>
      import(
        './pages/lead-form/lead-form.component'
      ).then(
        (component) =>
          component.LeadFormComponent,
      ),
  },

  {
    path:
      'teste/perguntas',

    title:
      'Grammar | Teste de Nivelamento | FB Language Center',

    canActivate: [
      testAttemptGuard,
    ],

    loadComponent: () =>
      import(
        './pages/test-questions/test-questions.component'
      ).then(
        (component) =>
          component.TestQuestionsComponent,
      ),
  },

  {
    path:
      'teste/listening',

    title:
      'Listening | Teste de Nivelamento | FB Language Center',

    canActivate: [
      testAttemptGuard,
    ],

    loadComponent: () =>
      import(
        './pages/test-listening/test-listening.component'
      ).then(
        (component) =>
          component.TestListeningComponent,
      ),
  },

  {
    path:
      'teste/speaking',

    title:
      'Speaking | Teste de Nivelamento | FB Language Center',

    canActivate: [
      testAttemptGuard,
    ],

    loadComponent: () =>
      import(
        './pages/test-speaking/test-speaking.component'
      ).then(
        (component) =>
          component.TestSpeakingComponent,
      ),
  },

  {
    path:
      'teste/processando',

    title:
      'Preparando resultado | FB Language Center',

    canActivate: [
      testAttemptGuard,
    ],

    loadComponent: () =>
      import(
        './pages/test-processing/test-processing.component'
      ).then(
        (component) =>
          component.TestProcessingComponent,
      ),
  },

  {
    path:
      'teste/resultado',

    title:
      'Seu resultado | FB Language Center',

    loadComponent: () =>
      import(
        './pages/test-result/test-result.component'
      ).then(
        (component) =>
          component.TestResultComponent,
      ),
  },
];
