import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards';
import { ShellComponent } from './layout/shell.component';
import { CustomerShellComponent } from './layout/customer-shell.component';

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./pages/auth/login.component').then((m) => m.LoginComponent) },
  { path: 'staff-login', canActivate: [guestGuard], loadComponent: () => import('./pages/auth/staff-login.component').then((m) => m.StaffLoginComponent) },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./pages/auth/register.component').then((m) => m.RegisterComponent) },

  {
    path: 'admin',
    component: ShellComponent,
    canActivate: [authGuard('admin')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./admin/dashboard.component').then((m) => m.DashboardComponent) },
      // Orders management now uses the same counter as the cashier
      { path: 'orders', loadComponent: () => import('./staff/counter.component').then((m) => m.CounterComponent) },
      { path: 'menu', loadComponent: () => import('./admin/menu.component').then((m) => m.MenuComponent) },
      { path: 'menu/new', loadComponent: () => import('./admin/menu-edit.component').then((m) => m.MenuEditComponent) },
      { path: 'menu/:id', loadComponent: () => import('./admin/menu-edit.component').then((m) => m.MenuEditComponent) },
      { path: 'vouchers', loadComponent: () => import('./admin/vouchers.component').then((m) => m.VouchersComponent) },
      { path: 'loyalty', loadComponent: () => import('./admin/loyalty.component').then((m) => m.LoyaltyComponent) },
      { path: 'reviews', loadComponent: () => import('./admin/reviews.component').then((m) => m.ReviewsComponent) },
      { path: 'users', loadComponent: () => import('./admin/users.component').then((m) => m.UsersComponent) },
      { path: 'audit', loadComponent: () => import('./admin/audit-logs.component').then((m) => m.AuditLogsComponent) },
    ],
  },

  {
    path: 'cashier',
    component: ShellComponent,
    canActivate: [authGuard('cashier')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'counter' },
      { path: 'counter', loadComponent: () => import('./staff/counter.component').then((m) => m.CounterComponent) },
      { path: 'orders', loadComponent: () => import('./staff/orders.component').then((m) => m.OrdersComponent) },
    ],
  },

  {
    path: 'customer',
    component: CustomerShellComponent,
    canActivate: [authGuard('customer')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'menu' },
      { path: 'menu', loadComponent: () => import('./customer/menu-browse.component').then((m) => m.MenuBrowseComponent) },
            { path: 'menu/:id', loadComponent: () => import('./customer/menu-item.component').then((m) => m.MenuItemComponent) },
      { path: 'cart', loadComponent: () => import('./customer/cart.component').then((m) => m.CartComponent) },
      { path: 'orders', loadComponent: () => import('./customer/my-orders.component').then((m) => m.MyOrdersComponent) },
      { path: 'orders/:id', loadComponent: () => import('./customer/order-detail.component').then((m) => m.OrderDetailComponent) },
      { path: 'rewards', loadComponent: () => import('./customer/rewards.component').then((m) => m.RewardsComponent) },
      { path: 'reviews', loadComponent: () => import('./customer/my-reviews.component').then((m) => m.MyReviewsComponent) },
      { path: 'account', loadComponent: () => import('./customer/account.component').then((m) => m.AccountComponent) },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];