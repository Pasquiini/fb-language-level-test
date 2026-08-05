import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'FB Language Center | Teste de Nivelamento',
    loadComponent: () =>
      import('./pages/home/home.component').then(
        (component) => component.Home,
      ),
  },
];
