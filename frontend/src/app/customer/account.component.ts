import { ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-account',
  imports: [FormsModule, DatePipe, RouterLink],
  template: `
    <h1>Edit your profile info</h1>
    <p class="sub">Keep your profile up to date and your account secure.</p>

    <div class="twocol" style="margin-top:1.2rem">
      <div class="stack">
        <div class="panel">
          <h2>Personal profile</h2>
          <div class="profile-head"><span class="avatar-lg">{{ initials() }}</span><div><b style="font-size:1.1rem">{{ me()?.name }}</b><br /><span class="chip">Customer account</span></div></div>
          @if (profErr()) { <div class="alert err">{{ profErr() }}</div> }
          @if (profMsg()) { <div class="alert ok">{{ profMsg() }}</div> }
          <label>Full name</label><input [(ngModel)]="profile.name" />
          <label>Email address</label><input type="email" [(ngModel)]="profile.email" />
          <p class="hint">Your order confirmation and status updates are sent to this email.</p>
          <p style="margin-top:1rem"><button class="btn" (click)="saveProfile()">Save profile</button></p>
        </div>

        <div class="panel">
          <h2>Change password</h2>
          @if (pwErr()) { <div class="alert err">{{ pwErr() }}</div> }
          @if (pwMsg()) { <div class="alert ok">{{ pwMsg() }}</div> }
          <label>Current password</label><input [type]="show() ? 'text' : 'password'" [(ngModel)]="pw.current" autocomplete="current-password" />
          <div class="row">
            <div><label>New password</label><input [type]="show() ? 'text' : 'password'" [(ngModel)]="pw.next" autocomplete="new-password" /></div>
            <div><label>Confirm new password</label><input [type]="show() ? 'text' : 'password'" [(ngModel)]="pw.confirm" autocomplete="new-password" /></div>
          </div>
          <label class="chk"><input type="checkbox" [ngModel]="show()" (ngModelChange)="show.set($event)" /> Show passwords</label>
          <p class="hint">Use at least 8 characters with a mix of letters and numbers. Choose a password you don’t use elsewhere.</p>
          <p style="margin-top:1rem"><button class="btn ghost" (click)="savePassword()">Update password</button></p>
        </div>
      </div>

      <div class="stack">
        <div class="panel">
          <h2>Your kitchen account</h2>
          <div class="kv"><span>Role</span><span>Customer</span></div>
          <div class="kv"><span>Member since</span><span>{{ me()?.created_at | date: 'MMMM y' }}</span></div>
          <div class="kv"><span>Points balance</span><b>{{ me()?.points ?? 0 }} points</b></div>
          <p style="margin-top:.6rem"><a class="link" routerLink="/customer/rewards">View rewards &amp; points history →</a></p>
        </div>
        <div class="note"><b>Your information stays yours</b>This account can only view its own orders, points, vouchers and reviews.</div>
        <div class="panel">
          <h2>Done for now?</h2>
          <p class="sub" style="font-size:.86rem;margin-bottom:.8rem">Log out to keep your account safe on a shared computer.</p>
          <button class="btn ghost block" (click)="auth.logout()">Log out</button>
        </div>
      </div>
    </div>
  `,
})
export class AccountComponent implements OnInit {
  private api = inject(Api);
  private cdr = inject(ChangeDetectorRef);
  auth = inject(AuthService);
  me = signal<any>(null);
  profile = { name: '', email: '' };
  pw = { current: '', next: '', confirm: '' };
  show = signal(false);
  profErr = signal(''); profMsg = signal(''); pwErr = signal(''); pwMsg = signal('');
  initials = computed(() => (this.me()?.name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join(''));

  ngOnInit() {
    this.api.get('/auth/me').subscribe((m) => { this.me.set(m); this.profile = { name: m.name, email: m.email }; this.cdr.markForCheck(); });
  }

  saveProfile() {
    this.profErr.set(''); this.profMsg.set('');
    this.api.patch('/auth/profile', this.profile).subscribe({
      next: (r) => { this.auth.setSession(r); this.me.set({ ...this.me(), name: r.user.name, email: r.user.email }); this.profMsg.set('Profile saved.'); },
      error: (e) => this.profErr.set(errMsg(e)),
    });
  }

  savePassword() {
    this.pwErr.set(''); this.pwMsg.set('');
    if (this.pw.next !== this.pw.confirm) { this.pwErr.set('The new passwords do not match'); return; }
    this.api.patch('/auth/password', { current_password: this.pw.current, new_password: this.pw.next }).subscribe({
      next: () => { this.pwMsg.set('Password updated.'); this.pw = { current: '', next: '', confirm: '' }; },
      error: (e) => this.pwErr.set(errMsg(e)),
    });
  }
}
