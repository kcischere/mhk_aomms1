import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-users',
  imports: [FormsModule, DatePipe],
  template: `
    <h1>Users</h1>
    <p class="muted">Create cashier and admin accounts. Customers sign up on their own.</p>
    <div class="toolbar">
      <input class="grow" placeholder="Search by name or email" [(ngModel)]="q" (input)="load()" />
      <select [(ngModel)]="role" (change)="load()">
        <option value="">All roles</option><option value="admin">Admin</option><option value="cashier">Cashier</option><option value="customer">Customer</option>
      </select>
      <button class="btn" (click)="openNew()">Add staff account</button>
    </div>
    @if (err() && !form) { <div class="alert err">{{ err() }}</div> }
    @if (msg()) { <div class="alert ok">{{ msg() }}</div> }

    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Points</th><th>Status</th><th>Joined</th><th></th></tr></thead>
        <tbody>
          @for (u of users(); track u.id) {
            <tr>
              <td><b>{{ u.name }}</b></td><td>{{ u.email }}</td>
              <td><span class="badge">{{ u.role }}</span></td>
              <td>{{ u.points }}</td>
              <td><span class="badge" [class]="u.is_active ? 'b-ok' : 'b-off'">{{ u.is_active ? 'Active' : 'Deactivated' }}</span></td>
              <td>{{ u.created_at | date: 'mediumDate' }}</td>
              <td><button class="btn sm ghost" (click)="openEdit(u)">Edit</button></td>
            </tr>
          } @empty { <tr><td colspan="7" class="empty">No users match.</td></tr> }
        </tbody>
      </table>
    </div>

    @if (form) {
      <div class="overlay"><div class="modal">
        <h2>{{ form.id ? 'Edit user' : 'Add staff account' }}</h2>
        @if (err()) { <div class="alert err">{{ err() }}</div> }
        <label>Full name</label><input [(ngModel)]="form.name" />
        @if (!form.id) { <label>Email</label><input type="email" [(ngModel)]="form.email" /> }
        <label>Role</label>
        <select [(ngModel)]="form.role" [disabled]="form.id === me()?.id">
          <option value="cashier">Cashier</option><option value="admin">Admin</option><option value="customer">Customer</option>
        </select>
        <label>{{ form.id ? 'New password (leave blank to keep the current one)' : 'Password (at least 8 characters)' }}</label>
        <input type="password" [(ngModel)]="form.password" autocomplete="new-password" />
        @if (form.id) { <label class="chk"><input type="checkbox" [(ngModel)]="form.is_active" [disabled]="form.id === me()?.id" /> Account is active</label> }
        <div class="actions" style="margin-top:1.2rem;justify-content:flex-end">
          <button class="btn ghost" (click)="form = null">Cancel</button>
          <button class="btn" (click)="save()">Save user</button>
        </div>
      </div></div>
    }
  `,
})
export class UsersComponent implements OnInit {
  private api = inject(Api);
  me = inject(AuthService).user;
  users = signal<any[]>([]);
  err = signal('');
  msg = signal('');
  q = ''; role = '';
  form: any = null;

  ngOnInit() { this.load(); }
  load() { this.api.get('/users', { q: this.q, role: this.role }).subscribe((r) => this.users.set(r)); }

  openNew() { this.err.set(''); this.msg.set(''); this.form = { name: '', email: '', role: 'cashier', password: '' }; }
  openEdit(u: any) { this.err.set(''); this.msg.set(''); this.form = { ...u, is_active: !!u.is_active, password: '' }; }

  save() {
    const f = this.form;
    const req = f.id
      ? this.api.patch(`/users/${f.id}`, { name: f.name, role: f.role, is_active: f.is_active, password: f.password || undefined })
      : this.api.post('/users', { name: f.name, email: f.email, role: f.role, password: f.password });
    req.subscribe({
      next: () => { this.msg.set(f.id ? 'User updated' : 'Account created'); this.form = null; this.err.set(''); this.load(); },
      error: (e) => this.err.set(errMsg(e)),
    });
  }
}
