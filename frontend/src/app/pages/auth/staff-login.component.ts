import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errMsg } from '../../core/api.service';
import { AuthHeroComponent } from './auth-hero.component';

@Component({
  selector: 'app-staff-login',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthHeroComponent],
  styleUrl: './auth.css',
  template: `
    <div class="auth">
      <app-auth-hero badge="The heart of the kitchen" />

      <main class="panel">
        <div class="panel-inner">
          <h1>Hello, kitchen team.</h1>
          <p class="sub">Sign in securely to the Mr. Hungry Kitchen workspace.</p>
          <span class="pill">Authorized staff only</span>

          @if (err()) {
            <div class="alert" role="alert">{{ err() }}</div>
          }

          <form (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="email">Staff email address</label>
              <input id="email" name="email" type="email" autocomplete="username" [(ngModel)]="email" />
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
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
              {{ loading() ? 'Signing in…' : 'Sign in to staff workspace' }}
            </button>
          </form>

          <div class="notice">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#b94e27" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <b>A protected workspace</b>
              <span>Only authorized administrator accounts can sign in. Need access? Contact the restaurant owner.</span>
            </div>
          </div>

          <a class="link small-link" routerLink="/login">← Back to customer login</a>
        </div>
      </main>
    </div>
  `,
})
export class StaffLoginComponent {
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
      this.err.set('Please enter your staff email and password.');
      return;
    }
    this.loading.set(true);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: (r) => {
        this.loading.set(false);
        // A customer tried the staff login: forget the session without redirecting.
        if (r.user.role !== 'admin' && r.user.role !== 'cashier') {
          this.auth.clear();
          this.err.set('This account is not authorized for the staff workspace.');
          return;
        }
        this.router.navigateByUrl(this.auth.homeFor(r.user.role));
      },
      error: (e) => {
        this.loading.set(false);
        this.err.set(errMsg(e));
      },
    });
  }
}
