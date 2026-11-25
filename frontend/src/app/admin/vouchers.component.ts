import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api, errMsg } from '../core/api.service';

@Component({
  selector: 'app-vouchers',
  imports: [FormsModule, CurrencyPipe],
  template: `
    <h1>Vouchers</h1>
    <p class="muted">Customers trade loyalty points for these vouchers and use them at checkout.</p>
    <div class="toolbar"><span class="grow"></span><button class="btn" (click)="openNew()">Add voucher</button></div>
    @if (err() && !form) { <div class="alert err">{{ err() }}</div> }
    @if (msg()) { <div class="alert ok">{{ msg() }}</div> }

    <div class="table-wrap">
      <table>
        <thead><tr><th>Code</th><th>Description</th><th>Discount</th><th>Points needed</th><th>Expires</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (v of vouchers(); track v.id) {
            <tr>
              <td><b>{{ v.code }}</b></td>
              <td>{{ v.description }}</td>
              <td>{{ v.value | currency: 'PHP' }}</td>
              <td>{{ v.points_cost }}</td>
              <td>{{ v.expires_at || 'No expiry' }}</td>
              <td><span class="badge" [class]="v.is_active ? 'b-ok' : 'b-off'">{{ v.is_active ? 'Active' : 'Inactive' }}</span></td>
              <td class="actions">
                <button class="btn sm ghost" (click)="openEdit(v)">Edit</button>
                <button class="btn sm ghost" [disabled]="busyId() === v.id" (click)="toggleActive(v)">{{ v.is_active ? 'Deactivate' : 'Activate' }}</button>
                <button class="btn sm danger" (click)="remove(v)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="empty">No vouchers yet. Add one so customers have something to redeem.</td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (form) {
      <div class="overlay"><div class="modal">
        <h2>{{ form.id ? 'Edit voucher' : 'Add voucher' }}</h2>
        @if (err()) { <div class="alert err">{{ err() }}</div> }
        <label>Voucher code</label><input [(ngModel)]="form.code" placeholder="WELCOME50" />
        <label>Description</label><input [(ngModel)]="form.description" />
        <div class="row">
          <div><label>Discount amount (PHP)</label><input type="number" min="1" [(ngModel)]="form.value" /></div>
          <div><label>Points needed to redeem</label><input type="number" min="0" [(ngModel)]="form.points_cost" /></div>
        </div>
        <label>Expiry date (optional)</label><input type="date" [(ngModel)]="form.expires_at" />
        <label class="chk"><input type="checkbox" [(ngModel)]="form.is_active" /> Active (customers can redeem it)</label>
        <div class="actions" style="margin-top:1.2rem;justify-content:flex-end">
          <button class="btn ghost" (click)="form = null">Cancel</button>
          <button class="btn" (click)="save()">Save voucher</button>
        </div>
      </div></div>
    }
  `,
})
export class VouchersComponent implements OnInit {
  private api = inject(Api);
  vouchers = signal<any[]>([]);
  err = signal('');
  msg = signal('');
  busyId = signal<number | null>(null);
  form: any = null;

  ngOnInit() { this.load(); }
  load() { this.api.get('/vouchers').subscribe((r) => this.vouchers.set(r)); }

  openNew() { this.err.set(''); this.msg.set(''); this.form = { code: '', description: '', value: 50, points_cost: 100, expires_at: '', is_active: true }; }
  openEdit(v: any) { this.err.set(''); this.msg.set(''); this.form = { ...v, is_active: !!v.is_active, expires_at: v.expires_at || '' }; }

  private body(f: any, isActive: boolean) {
    return {
      code: f.code, description: f.description, value: Number(f.value), points_cost: Number(f.points_cost),
      expires_at: f.expires_at || null, is_active: isActive,
    };
  }

  save() {
    const f = this.form;
    const body = this.body(f, !!f.is_active);
    const req = f.id ? this.api.put(`/vouchers/${f.id}`, body) : this.api.post('/vouchers', body);
    req.subscribe({
      next: () => { this.msg.set(f.id ? 'Voucher updated' : 'Voucher added'); this.form = null; this.err.set(''); this.load(); },
      error: (e) => this.err.set(errMsg(e)),
    });
  }

  // One-click activate / deactivate, keeping every other field as it is
  toggleActive(v: any) {
    const turnOn = !v.is_active;
    this.busyId.set(v.id);
    this.err.set(''); this.msg.set('');
    this.api.put(`/vouchers/${v.id}`, this.body(v, turnOn)).subscribe({
      next: () => {
        this.busyId.set(null);
        this.msg.set(`Voucher ${v.code} ${turnOn ? 'activated' : 'deactivated'}`);
        this.load();
      },
      error: (e) => { this.busyId.set(null); this.err.set(errMsg(e)); },
    });
  }

  remove(v: any) {
    if (!confirm(`Delete voucher ${v.code}?`)) return;
    this.err.set(''); this.msg.set('');
    this.api.delete(`/vouchers/${v.id}`).subscribe({
      next: () => { this.msg.set('Voucher deleted'); this.load(); },
      error: (e) => {
        const m = errMsg(e);
        this.err.set(/deactivate/i.test(m) ? `${m}. Use the Deactivate button on that row.` : m);
      },
    });
  }
}