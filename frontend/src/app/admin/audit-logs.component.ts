import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api, errMsg } from '../core/api.service';

@Component({
  selector: 'app-audit-logs',
  imports: [FormsModule, DatePipe],
  template: `
    <h1>Audit logs</h1>
    <p class="muted">A record of who did what in the system. Entries cannot be edited or deleted.</p>
    <div class="toolbar">
      <input class="grow" placeholder="Search user, action or details" [(ngModel)]="f.q" (keyup.enter)="search()" />
      <select [(ngModel)]="f.action" (change)="search()">
        <option value="">All actions</option>
        @for (a of actions(); track a) { <option [value]="a">{{ a }}</option> }
      </select>
      <select [(ngModel)]="f.role" (change)="search()">
        <option value="">All roles</option><option value="admin">Admin</option><option value="cashier">Cashier</option><option value="customer">Customer</option>
      </select>
      <input type="date" [(ngModel)]="f.from" (change)="search()" title="From date" />
      <input type="date" [(ngModel)]="f.to" (change)="search()" title="To date" />
      <button class="btn" (click)="search()">Search</button>
    </div>
    @if (err()) { <div class="alert err">{{ err() }}</div> }

    <div class="table-wrap">
      <table>
        <thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Record</th><th>Details</th></tr></thead>
        <tbody>
          @for (r of rows(); track r.id) {
            <tr>
              <td>{{ r.created_at | date: 'MMM d, y, h:mm a' }}</td>
              <td>{{ r.user_name || 'Unknown' }}</td>
              <td>{{ r.role || '-' }}</td>
              <td><b>{{ r.action }}</b></td>
              <td>{{ r.entity ? r.entity + ' #' + (r.entity_id ?? '') : '-' }}</td>
              <td><code style="font-size:.8rem;word-break:break-word">{{ r.details }}</code></td>
            </tr>
          } @empty { <tr><td colspan="6" class="empty">No log entries match these filters.</td></tr> }
        </tbody>
      </table>
    </div>
    <div class="toolbar">
      <button class="btn ghost sm" [disabled]="page <= 1" (click)="go(-1)">Previous</button>
      <span class="muted">Page {{ page }} of {{ pages() }} ({{ total() }} entries)</span>
      <button class="btn ghost sm" [disabled]="page >= pages()" (click)="go(1)">Next</button>
    </div>
  `,
})
export class AuditLogsComponent implements OnInit {
  private api = inject(Api);
  rows = signal<any[]>([]);
  total = signal(0);
  actions = signal<string[]>([]);
  err = signal('');
  f = { q: '', action: '', role: '', from: '', to: '' };
  page = 1;
  limit = 20;

  ngOnInit() {
    this.api.get<string[]>('/audit/actions').subscribe((r) => this.actions.set(r));
    this.load();
  }
  load() {
    this.api.get('/audit', { ...this.f, page: this.page, limit: this.limit }).subscribe({
      next: (r) => { this.rows.set(r.rows); this.total.set(r.total); },
      error: (e) => this.err.set(errMsg(e)),
    });
  }
  search() { this.page = 1; this.load(); }
  pages() { return Math.max(1, Math.ceil(this.total() / this.limit)); }
  go(d: number) { this.page = Math.min(this.pages(), Math.max(1, this.page + d)); this.load(); }
}
