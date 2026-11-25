import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api, errMsg } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-customer-home',
  imports: [FormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="top">
      <div><b>Mr. Hungry Kitchen</b> — hello, {{ auth.user()?.name }}. You have <b>{{ me()?.points ?? 0 }}</b> points.</div>
      <button class="btn ghost sm" (click)="auth.logout()">Log out</button>
    </div>
    <div class="cust">
      <section>
        <h2>Menu</h2>
        @if (msg()) { <div class="alert ok">{{ msg() }}</div> }
        <div class="menu-grid">
          @for (m of menu(); track m.id) {
            <div class="card">
              <b>{{ m.name }}</b>
              <div class="muted">{{ m.description }}</div>
              <p>{{ m.price | currency: 'PHP' }} <span class="badge" [class]="m.available ? 'b-ok' : 'b-off'">{{ m.available ? 'Available' : 'Unavailable' }}</span></p>
              <div class="qty">
                <button class="btn sm ghost" [disabled]="!m.available" (click)="change(m, -1)">−</button>
                <span>{{ qty[m.id] || 0 }}</span>
                <button class="btn sm ghost" [disabled]="!m.available" (click)="change(m, 1)">+</button>
              </div>
            </div>
          } @empty { <div class="card empty">The menu is empty right now.</div> }
        </div>

        <h2 style="margin-top:2rem">My orders</h2>
        <div class="orders">
          @for (o of orders(); track o.id) {
            <div class="card">
              <b>Order #{{ o.id }} · {{ o.scheduled_at | date: 'MMM d, h:mm a' }}</b>
              <span class="badge" [class]="'b-' + o.status.toLowerCase()">{{ o.status }}</span>
              <div class="muted">{{ o.order_type === 'pickup' ? 'Pick-up' : 'Dine-in' }} · Total {{ o.total | currency: 'PHP' }} · {{ o.payment_status }}</div>
              @if (o.reject_reason) { <div class="muted">Rejected because: {{ o.reject_reason }}</div> }
            </div>
          } @empty { <div class="card empty">No orders yet. Pick items from the menu to place your first order.</div> }
        </div>
      </section>

      <aside class="card cart">
        <h2>Your order</h2>
        @if (err()) { <div class="alert err">{{ err() }}</div> }
        @for (m of cart(); track m.id) { <div>{{ qty[m.id] }} × {{ m.name }}</div> } @empty { <p class="muted">Nothing added yet.</p> }
        <p><b>Total {{ total() | currency: 'PHP' }}</b></p>
        <label>Order type</label>
        <select [(ngModel)]="orderType"><option value="pickup">Pick-up</option><option value="dine_in">Dine-in</option></select>
        <label>Date and time</label>
        <input type="datetime-local" [(ngModel)]="scheduledAt" />
        <label>Notes (optional)</label>
        <input [(ngModel)]="notes" />
        <p class="muted">Pay at pick-up or in the restaurant.</p>
        <button class="btn" style="width:100%" [disabled]="!cart().length || !scheduledAt" (click)="place()">Place order</button>
      </aside>
    </div>
  `,
  styles: [`
    :host{display:block;min-height:100vh;background:#f2f4f0;color:#1c2321;font-family:system-ui,'Segoe UI',sans-serif}
    .top{background:#16403a;color:#fff;padding:.9rem 2rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap}
    .cust{display:grid;grid-template-columns:1fr 340px;gap:1.5rem;padding:1.5rem 2rem;align-items:start}
    .menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem}
    .card{background:#fff;border:1px solid #dbe2dc;border-radius:8px;padding:1rem}
    .orders{display:grid;gap:.8rem}
    .cart{position:sticky;top:1rem}
    .btn{font:inherit;font-weight:600;padding:.5rem .95rem;border-radius:6px;border:1px solid #1f7a63;background:#1f7a63;color:#fff;cursor:pointer}
    .btn.ghost{background:transparent;color:#1f7a63}
    .top .btn.ghost{color:#fff;border-color:#4f7a70}
    .btn.sm{padding:.25rem .65rem}
    .btn:disabled{opacity:.5;cursor:not-allowed}
    .qty{display:flex;align-items:center;gap:.6rem}
    .badge{display:inline-block;padding:.1rem .55rem;border-radius:999px;font-size:.78rem;font-weight:600;background:#e5e7e5}
    .b-ok,.b-completed,.b-paid{background:#c9efdc;color:#0b5a3a}
    .b-off,.b-rejected,.b-cancelled{background:#fbdcd9;color:#8f211a}
    .b-pending,.b-unpaid{background:#fcefc9;color:#7a5200}
    .b-confirmed,.b-preparing,.b-ready{background:#dbeafe;color:#1e40af}
    .muted{color:#627069}
    .alert{padding:.6rem .9rem;border-radius:6px;margin:.6rem 0}
    .alert.ok{background:#c9efdc;color:#0b5a3a}
    .alert.err{background:#fbdcd9;color:#8f211a}
    label{display:block;font-size:.85rem;color:#627069;margin:.7rem 0 .25rem}
    input,select{width:100%;font:inherit;padding:.5rem .65rem;border:1px solid #dbe2dc;border-radius:6px}
    .empty{text-align:center;color:#627069}
    @media(max-width:860px){.cust{grid-template-columns:1fr}}
  `],
})
export class CustomerHomeComponent implements OnInit {
  private api = inject(Api);
  auth = inject(AuthService);
  menu = signal<any[]>([]);
  orders = signal<any[]>([]);
  me = signal<any>(null);
  msg = signal('');
  err = signal('');
  qty: Record<number, number> = {};
  orderType = 'pickup';
  scheduledAt = '';
  notes = '';

  ngOnInit() { this.load(); }
  load() {
    this.api.get('/menu').subscribe((r) => this.menu.set(r));
    this.api.get('/orders/mine').subscribe((r) => this.orders.set(r));
    this.api.get('/auth/me').subscribe((r) => this.me.set(r));
  }

  change(m: any, d: number) { this.qty[m.id] = Math.max(0, (this.qty[m.id] || 0) + d); }
  cart() { return this.menu().filter((m) => this.qty[m.id] > 0); }
  total() { return this.cart().reduce((s, m) => s + m.price * this.qty[m.id], 0); }

  place() {
    this.err.set(''); this.msg.set('');
    const items = this.cart().map((m) => ({ menu_item_id: m.id, quantity: this.qty[m.id] }));
    this.api.post('/orders', { order_type: this.orderType, scheduled_at: this.scheduledAt, notes: this.notes, items }).subscribe({
      next: () => { this.qty = {}; this.notes = ''; this.msg.set('Order placed. The cashier will confirm it soon.'); this.load(); },
      error: (e) => this.err.set(errMsg(e)),
    });
  }
}