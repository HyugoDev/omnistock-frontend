import { Routes } from '@angular/router';

export const routes: Routes = [
  // Al entrar a la raíz, redirige al Dashboard:
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((m) => m.Dashboard)
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./features/products/product-list/product-list').then(
        (m) => m.ProductList
      )
  }
];