import {
  Routes,
} from '@angular/router';

import {
  adminGuard,
} from './core/guards/admin.guard';

import {
  authGuard,
} from './core/guards/auth.guard';

import {
  testAttemptGuard,
} from './core/guards/test-attempt.guard';
import { studentGuard } from './core/guards/student.guard';

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
      'login',

    title:
      'Entrar | FB Language Center',

    loadComponent: () =>
      import(
        './pages/login/login.component'
      ).then(
        (component) =>
          component.LoginComponent,
      ),
  },
  {
    path:
      'primeiro-acesso',

    title:
      'Primeiro acesso | FB Language Center',

    loadComponent: () =>
      import(
        './pages/first-access/first-access.component'
      ).then(
        (component) =>
          component.FirstAccessComponent,
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

  {
    path:
      'admin',

    canActivate: [
      authGuard,
      adminGuard,
    ],

    loadComponent: () =>
      import(
        './pages/admin/admin-layout/admin-layout.component'
      ).then(
        (component) =>
          component.AdminLayoutComponent,
      ),

    children: [
      {
        path: '',

        pathMatch:
          'full',

        title:
          'Administração | FB Language Center',

        loadComponent: () =>
          import(
            './pages/admin/admin-dashboard/admin-dashboard.component'
          ).then(
            (component) =>
              component.AdminDashboardComponent,
          ),
      },

      {
        path:
          'avaliacoes',

        title:
          'Avaliações | Administração | FB Language Center',

        loadComponent: () =>
          import(
            './pages/admin/test-reviews/test-reviews.component'
          ).then(
            (component) =>
              component.TestReviewsComponent,
          ),
      },

      {
        path:
          'avaliacoes/:attemptId',

        title:
          'Avaliação | Administração | FB Language Center',

        loadComponent: () =>
          import(
            './pages/admin/test-review-detail/test-review-detail.component'
          ).then(
            (component) =>
              component.TestReviewDetailComponent,
          ),
      },
      {
        path:
          'alunos',

        title:
          'Alunos | Administração | FB Language Center',

        loadComponent: () =>
          import(
            './pages/admin/students/students.component'
          ).then(
            (component) =>
              component.StudentsComponent,
          ),
      },
      {
        path:
          'alunos/:studentId',

        title:
          'Aluno | Administração | FB Language Center',

        loadComponent: () =>
          import(
            './pages/admin/student-detail/student-detail.component'
          ).then(
            (component) =>
              component.StudentDetailComponent,
          ),
      },
      {
        path:
          'whatsapp',

        title:
          'WhatsApp | Administração | FB Language Center',

        loadComponent: () =>
          import(
            './pages/admin/whatsapp-manager/whatsapp-manager.component'
          ).then(
            (component) =>
              component.WhatsappManagerComponent,
          ),
      },
    ],
  },
  {
    path:
      'portal',

    canActivate: [
      authGuard,
      studentGuard,
    ],

    loadComponent: () =>
      import(
        './pages/portal/portal-layout/portal-layout.component'
      ).then(
        (component) =>
          component.PortalLayoutComponent,
      ),

    children: [
      {
        path: '',

        pathMatch:
          'full',

        title:
          'Portal do aluno | FB Language Center',

        loadComponent: () =>
          import(
            './pages/portal/portal-dashboard/portal-dashboard.component'
          ).then(
            (component) =>
              component.PortalDashboardComponent,
          ),
      },
      {
        path:
          'testes',

        title:
          'Meus testes | FB Language Center',

        loadComponent: () =>
          import(
            './pages/portal/portal-tests/portal-tests.component'
          ).then(
            (component) =>
              component.PortalTestsComponent,
          ),
      },

      {
        path:
          'perfil',

        title:
          'Meu perfil | FB Language Center',

        loadComponent: () =>
          import(
            './pages/portal/portal-profile/portal-profile.component'
          ).then(
            (component) =>
              component.PortalProfileComponent,
          ),
      },
    ],
  },
];
