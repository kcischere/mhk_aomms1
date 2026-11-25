import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { LOGO } from './customer-shell.component';

const ICON = {
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  menu: 'M6 3v8 M10 3v8 M6 7h4 M8 11v10 M17 3c-2 2-3 5-3 8h3v10',
  orders: 'M9 4h6v3H9z M7 5.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-1 M8.5 12h7 M8.5 16h5',
  gift: 'M4 9h16v4H4z M12 9v12 M5 13v8h14v-8 M12 9c-1-3.5-5.5-3.5-5.5-1S10 9 12 9 M12 9c1-3.5 5.5-3.5 5.5-1S14 9 12 9',
  chat: 'M4 5h16v11H9l-5 4z',
  ticket: 'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z M14 7v10',
  users: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M4 21c0-4 3.5-6 8-6s8 2 8 6',
  audit: 'M6 3h12v18H6z M9 8h6 M9 12h6 M9 16h4',
};

const ADMIN = [
  { path: '/admin/dashboard', label: 'Overview', icon: ICON.grid },
  { path: '/admin/menu', label: 'Menu management', icon: ICON.menu },
  { path: '/admin/orders', label: 'Orders management', icon: ICON.orders },
  { path: '/admin/loyalty', label: 'Loyalty settings', icon: ICON.gift },
  { path: '/admin/reviews', label: 'Review moderation', icon: ICON.chat },
  { path: '/admin/vouchers', label: 'Vouchers', icon: ICON.ticket },
  { path: '/admin/users', label: 'Users', icon: ICON.users },
  { path: '/admin/audit', label: 'Audit logs', icon: ICON.audit },
];

const CASHIER = [
  { path: '/cashier/counter', label: 'Counter', icon: ICON.grid },
  { path: '/cashier/orders', label: 'All orders', icon: ICON.orders },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
  styleUrls: ['./staff.css', './shell-theme.css'],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="app-staff">
      <div class="shell" [class.open]="open()">
        <aside class="side">
          <div class="brand">
            <span class="logo"><img [src]="logo" alt="Mr. Hungry Kitchen" /></span>
            <div><b>mr. hungry</b><small>KITCHEN</small></div>
          </div>
          <div class="tagline">Satisfy Every Craving</div>
          <div class="side-label">{{ isAdmin() ? 'ADMINISTRATOR WORKSPACE' : 'CASHIER WORKSPACE' }}</div>
          <nav>
            @for (l of links(); track l.path) {
              <a [routerLink]="l.path" routerLinkActive="active" (click)="open.set(false)"><svg viewBox="0 0 24 24"><path [attr.d]="l.icon" /></svg>{{ l.label }}</a>
            }
          </nav>
          <div class="side-note"><b>Made here. Enjoyed here.</b><span>Pickup &amp; dine-in pre-orders</span><span>Daily · 10:00 AM – 8:00 PM</span></div>
          <div class="me">
            <span class="avatar">{{ initials() }}</span>
            <div><b>{{ auth.user()?.name }}</b><small>{{ isAdmin() ? 'Administrator' : 'Cashier' }}</small></div>
          </div>
          <button class="logout" (click)="auth.logout()">↪ Log out</button>
        </aside>
        <div class="scrim" (click)="open.set(false)"></div>
        <div class="content">
          <header class="topbar">
            <span><button class="menu-btn" (click)="open.set(!open())" aria-label="Menu">&#9776;</button>KITCHEN OPERATIONS / {{ section() }}</span>
            <span class="right"><span class="pill">Staff access</span>{{ today | date: 'EEE, d MMMM y' }}</span>
          </header>
          <main><router-outlet /></main>
          <footer><span>Mr. Hungry Kitchen · A little advance, a lot of sarap.</span><span>MHK-AOMMS</span></footer>
        </div>
      </div>
    </div>
  `,
})
export class ShellComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  logo = LOGO;
  today = new Date();
  open = signal(false);
  isAdmin = computed(() => this.auth.user()?.role === 'admin');
  links = computed(() => (this.isAdmin() ? ADMIN : CASHIER));
  private url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  section = computed(() => this.links().find((l) => this.url().startsWith(l.path))?.label ?? '');
  initials = computed(() =>
    (this.auth.user()?.name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join(''),
  );
}