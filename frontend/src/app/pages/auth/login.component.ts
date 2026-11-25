import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errMsg } from '../../core/api.service';
import { AuthHeroComponent } from './auth-hero.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthHeroComponent],
  styleUrl: './auth.css',
  template: `
    <div class="auth">
      <app-auth-hero badge="Your neighborhood favorite" />

      <main class="panel">
        <div class="panel-inner">
          <h1>Welcome back, ka-hungry.</h1>
          <p class="sub">Log in for good food, your next order and little rewards.</p>

          @if (err()) {
            <div class="alert" role="alert">{{ err() }}</div>
          }

          <form (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="email">Email address</label>
              <input id="email" name="email" type="email" autocomplete="email"
                     [(ngModel)]="email" />
            </div>

            <div class="field">
              <label for="password">Password</label>
              <div class="pw">
                <input id="password" name="password" class="has-eye" autocomplete="current-password"
                       [type]="showPw() ? 'text' : 'password'" [(ngModel)]="password" />
                <button type="button" class="eye" (click)="showPw.set(!showPw())"
                        [attr.aria-label]="showPw() ? 'Hide password' : 'Show password'">
                  @if (showPw()) {
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  } @else {
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  }
                </button>
              </div>
            </div>

            <button class="btn" type="submit" [disabled]="loading()">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
              {{ loading() ? 'Logging in…' : 'Log in' }}
            </button>
          </form>

          <p class="switch">New to the kitchen? <a class="link" routerLink="/register">Create an account</a></p>

          <div class="divider"></div>
          <p class="note">Ordering ahead for pickup or dine-in. Pay when you arrive — no online payment needed.</p>
          <a class="link small-link" routerLink="/staff-login">Kitchen staff? Go to secure staff login →</a>
        </div>
      </main>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  showPw = signal(false);
  err = signal('');
  loading = signal(false);

  submit() {
    this.err.set('');
    if (!this.email.trim() || !this.password) {
      this.err.set('Please enter your email and password.');
      return;
    }
    this.loading.set(true);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.router.navigateByUrl(this.auth.homeFor(r.user.role));
      },
      error: (e) => {
        this.loading.set(false);
        this.err.set(errMsg(e));
      },
    });
  }
}
