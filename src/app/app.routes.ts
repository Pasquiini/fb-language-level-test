import {
  Routes,
} from '@angular/router';

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
    path: 'teste',
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
    path: 'teste/dados',
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
    path: 'teste/perguntas',
    title:
      'Grammar | Teste de Nivelamento | FB Language Center',
    loadComponent: () =>
      import(
        './pages/test-questions/test-questions.component'
      ).then(
        (component) =>
          component.TestQuestionsComponent,
      ),
  },
];
