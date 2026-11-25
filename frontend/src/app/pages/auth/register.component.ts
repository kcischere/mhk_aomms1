import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errMsg } from '../../core/api.service';
import { AuthHeroComponent } from './auth-hero.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthHeroComponent],
  styleUrl: './auth.css',
  template: `
    <div class="auth">
      <app-auth-hero badge="Your neighborhood favorite" />

      <main class="panel">
        <div class="panel-inner">
          <h1>Welcome to Mr. Hungry Kitchen!</h1>
          <p class="sub">Create your customer account and make your next meal a little easier.</p>

          @if (err()) {
            <div class="alert" role="alert">{{ err() }}</div>
          }

          <form (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="name">Full name</label>
              <input id="name" name="name" type="text" autocomplete="name" [(ngModel)]="name" />
            </div>

            <div class="field">
              <label for="email">Email address</label>
              <input id="email" name="email" type="email" autocomplete="email" [(ngModel)]="email" />
            </div>

            <div class="field">
              <label for="password">Password</label>
              <div class="pw">
                <input id="password" name="password" class="has-eye" autocomplete="new-password"
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
              <p class="hint">Use at least 8 characters with a mix of letters and numbers.</p>
            </div>

            <div class="field">
              <label for="confirm">Confirm password</label>
              <div class="pw">
                <input id="confirm" name="confirm" class="has-eye" autocomplete="new-password"
                       [type]="showConfirm() ? 'text' : 'password'" [(ngModel)]="confirm" />
                <button type="button" class="eye" (click)="showConfirm.set(!showConfirm())"
                        [attr.aria-label]="showConfirm() ? 'Hide password' : 'Show password'">
                  @if (showConfirm()) {
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
              {{ loading() ? 'Creating account…' : 'Create customer account' }}
            </button>
          </form>

          <p class="switch">Already part of the kitchen? <a class="link" routerLink="/login">Log in</a></p>
          <p class="foot">Your account keeps your own orders, points, vouchers and reviews together.</p>
        </div>
      </main>
    </div>
  `,
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  name = '';
  email = '';
  password = '';
  confirm = '';
  showPw = signal(false);
  showConfirm = signal(false);
  err = signal('');
  loading = signal(false);

  submit() {
    this.err.set('');
    const name = this.name.trim();
    const email = this.email.trim();

    if (!name || !email || !this.password) {
      this.err.set('Please fill in your name, email and password.');
      return;
    }
    if (this.password.length < 8 || !/[A-Za-z]/.test(this.password) || !/\d/.test(this.password)) {
      this.err.set('Use at least 8 characters with a mix of letters and numbers.');
      return;
    }
    if (this.password !== this.confirm) {
      this.err.set('Passwords do not match.');
      return;
    }

    this.loading.set(true);
    this.auth.register(name, email, this.password).subscribe({
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
