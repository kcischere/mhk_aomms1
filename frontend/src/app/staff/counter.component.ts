import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../core/api.service';

type Tab = 'new' | 'active' | 'done';

const ACTIVE = ['Confirmed', 'Preparing', 'Ready'];
const DONE = ['Completed', 'Rejected', 'Cancelled'];
const NEXT: Record<string, { status: string; label: string }> = {
  Confirmed: { status: 'Preparing', label: 'Start preparing' },
  Preparing: { status: 'Ready', label: 'Mark ready' },
  Ready: { status: 'Completed', label: 'Complete order' },
};

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="counter">
      <div class="bar">
        <h2>Counter</h2>
        <div class="search">
          <input type="search" placeholder="Search order #, name or email" [(ngModel)]="q" (keyup.enter)="load()" />
          <button class="btn ghost" (click)="load()">Search</button>
        </div>
      </div>

      @if (msg()) { <div class="note ok">{{ msg() }}</div> }
      @if (err()) { <div class="note bad">{{ err() }}</div> }

      <div class="tabs">
        <button [class.on]="tab() === 'new'" (click)="tab.set('new')">
          New orders <span class="pill">{{ newOrders().length }}</span>
        </button>
        <button [class.on]="tab() === 'active'" (click)="tab.set('active')">
          In progress <span class="pill">{{ activeOrders().length }}</span>
        </button>
        <button [class.on]="tab() === 'done'" (click)="tab.set('done')">
          Done <span class="pill">{{ doneOrders().length }}</span>
        </button>
      </div>

      @if (shown().length === 0) {
        <p class="empty">{{ loading() ? 'Loading orders...' : 'Nothing here right now.' }}</p>
      }

      @for (o of shown(); track o.id) {
        <article class="card">
          <header>
            <div>
              <strong>{{ ref(o.id) }}</strong>
              <span class="badge" [attr.data-status]="o.status">{{ o.status }}</span>
              @if (o.payment_status === 'Paid') { <span class="badge paid">Paid</span> }
              @else if (ACTIVE_STATES.includes(o.status)) { <span class="badge unpaid">Unpaid</span> }
            </div>
            <div class="when">{{ typeLabel(o.order_type) }} &middot; {{ when(o.scheduled_at) }}</div>
          </header>

          <div class="who">{{ o.customer_name }} <span class="muted">{{ o.customer_email }}</span></div>

          <ul class="items">
            @for (it of o.items || []; track $index) {
              <li><span>{{ it.quantity }} &times; {{ it.name }}</span><span>{{ money(it.price * it.quantity) }}</span></li>
            }
          </ul>

          @if (o.notes) { <div class="notes">Note: {{ o.notes }}</div> }
          @if (o.reject_reason) { <div class="notes">Reason: {{ o.reject_reason }}</div> }

          <div class="totals">
            @if (Number(o.discount) > 0) {
              <div><span>Voucher {{ o.voucher_code }}</span><span>-{{ money(o.discount) }}</span></div>
            }
            <div class="grand"><span>Total</span><span>{{ money(o.total) }}</span></div>
            @if (o.payment_status === 'Paid') {
              <div><span>Received</span><span>{{ money(o.amount_received) }}</span></div>
            }
          </div>

          @if (canPay(o)) {
            <div class="pay">
              <label>Cash received</label>
              <input type="number" min="0" step="0.01" [(ngModel)]="cash[o.id]" placeholder="0.00" />
              <button class="btn ghost" (click)="exact(o)">Exact</button>
              <button class="btn primary" [disabled]="!enough(o) || busyId() === o.id" (click)="pay(o)">
                Receive payment
              </button>
              @if (enough(o)) { <span class="chg">Change: {{ money(change(o)) }}</span> }
            </div>
          }

          <div class="actions">
            @if (o.status === 'Pending') {
              <button class="btn primary" [disabled]="busyId() === o.id" (click)="setStatus(o, 'Confirmed')">Accept order</button>
              <button class="btn danger" [disabled]="busyId() === o.id" (click)="reject(o)">Reject</button>
            }
            @if (next(o); as n) {
              <button class="btn primary"
                [disabled]="busyId() === o.id || (n.status === 'Completed' && o.payment_status !== 'Paid')"
                (click)="setStatus(o, n.status)">{{ n.label }}</button>
              @if (n.status === 'Completed' && o.payment_status !== 'Paid') {
                <span class="muted">Receive payment first</span>
              }
            }
            @if (ACTIVE_STATES.includes(o.status)) {
              <button class="btn ghost" [disabled]="busyId() === o.id" (click)="cancel(o)">Cancel order</button>
            }
          </div>
        </article>
      }
    </div>
  `,
  styles: [`
    .counter { background: #f7f5f2; color: #222; border-radius: 12px; padding: 20px; max-width: 980px; margin: 0 auto; }
    .bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    .bar h2 { margin: 0; font-size: 22px; }
    .search { display: flex; gap: 8px; }
    .search input, .pay input { padding: 8px 10px; border: 1px solid #cfc9c0; border-radius: 8px; background: #fff; color: #222; }
    .search input { min-width: 240px; }
    .tabs { display: flex; gap: 8px; margin: 12px 0 16px; flex-wrap: wrap; }
    .tabs button { padding: 8px 14px; border: 1px solid #cfc9c0; background: #fff; color: #222; border-radius: 999px; cursor: pointer; }
    .tabs button.on { background: #222; color: #fff; border-color: #222; }
    .pill { display: inline-block; min-width: 20px; padding: 0 6px; margin-left: 4px; border-radius: 999px; background: #e8e3da; color: #222; font-size: 12px; text-align: center; }
    .tabs .on .pill { background: #fff; }
    .note { padding: 10px 12px; border-radius: 8px; margin-bottom: 10px; }
    .note.ok { background: #e3f4e6; color: #17491f; }
    .note.bad { background: #fbe4e2; color: #7a1b14; }
    .empty { text-align: center; color: #777; padding: 30px 0; }
    .card { background: #fff; border: 1px solid #e3ddd3; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
    .card header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
    .when, .muted { color: #777; font-size: 13px; }
    .who { margin-bottom: 8px; }
    .badge { display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 999px; font-size: 12px; background: #eee; }
    .badge[data-status="Pending"] { background: #fff1cc; color: #7a5600; }
    .badge[data-status="Confirmed"], .badge[data-status="Preparing"] { background: #dcebff; color: #12408a; }
    .badge[data-status="Ready"], .badge[data-status="Completed"], .badge.paid { background: #dff3e3; color: #17491f; }
    .badge[data-status="Rejected"], .badge[data-status="Cancelled"], .badge.unpaid { background: #fbe4e2; color: #7a1b14; }
    .items { list-style: none; margin: 0 0 8px; padding: 8px 0; border-top: 1px dashed #ddd; border-bottom: 1px dashed #ddd; }
    .items li, .totals div { display: flex; justify-content: space-between; padding: 2px 0; }
    .totals { margin-bottom: 10px; }
    .grand { font-weight: 700; font-size: 16px; }
    .notes { font-size: 13px; background: #faf7f0; padding: 6px 8px; border-radius: 6px; margin-bottom: 8px; }
    .pay { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; background: #faf7f0; padding: 10px; border-radius: 8px; margin-bottom: 10px; }
    .chg { font-weight: 700; color: #17491f; }
    .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .btn { padding: 8px 14px; border-radius: 8px; border: 1px solid transparent; cursor: pointer; font-weight: 600; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn.primary { background: #c8102e; color: #fff; }
    .btn.danger { background: #fff; color: #c8102e; border-color: #c8102e; }
    .btn.ghost { background: #fff; color: #222; border-color: #cfc9c0; }
  `],
})
export class CounterComponent implements OnInit, OnDestroy {
  private api = inject(Api);

  readonly ACTIVE_STATES = ACTIVE;
  readonly Number = Number;

  orders = signal<any[]>([]);
  tab = signal<Tab>('new');
  loading = signal(true);
  busyId = signal<number | null>(null);
  msg = signal('');
  err = signal('');
  q = '';
  cash: Record<number, number | null> = {};
  private timer: any;

  newOrders = computed(() => this.byTime(this.orders().filter((o) => o.status === 'Pending')));
  activeOrders = computed(() => this.byTime(this.orders().filter((o) => ACTIVE.includes(o.status))));
  doneOrders = computed(() => this.orders().filter((o) => DONE.includes(o.status)));
  shown = computed(() => {
    const t = this.tab();
    return t === 'new' ? this.newOrders() : t === 'active' ? this.activeOrders() : this.doneOrders();
  });

  ngOnInit() {
    this.load();
    // New orders show up on their own
    this.timer = setInterval(() => this.load(), 15000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  load() {
    const qs = 'limit=100&sort=desc' + (this.q.trim() ? '&q=' + encodeURIComponent(this.q.trim()) : '');
    this.api.get('/orders?' + qs).subscribe({
      next: (r: any) => {
        this.orders.set(r.rows || []);
        this.loading.set(false);
      },
      error: (e: any) => {
        this.err.set(this.errMsg(e));
        this.loading.set(false);
      },
    });
  }

  setStatus(o: any, status: string, reason?: string) {
    this.busyId.set(o.id);
    this.err.set('');
    this.api.patch('/orders/' + o.id + '/status', { status, reason }).subscribe({
      next: (r: any) => {
        this.busyId.set(null);
        this.flash(this.ref(o.id) + ': ' + (r?.message || 'updated') + (r?.points_awarded ? ' (+' + r.points_awarded + ' pts to customer)' : ''));
        this.load();
      },
      error: (e: any) => {
        this.busyId.set(null);
        this.err.set(this.errMsg(e));
      },
    });
  }

  reject(o: any) {
    const reason = prompt('Reason for rejecting ' + this.ref(o.id) + '? (the customer will be emailed)');
    if (reason === null) return;
    if (!reason.trim()) {
      this.err.set('Give a reason for rejecting the order');
      return;
    }
    this.setStatus(o, 'Rejected', reason.trim());
  }

  cancel(o: any) {
    if (!confirm('Cancel ' + this.ref(o.id) + '?')) return;
    this.setStatus(o, 'Cancelled');
  }

  pay(o: any) {
    const amount = Number(this.cash[o.id]);
    if (!(amount >= Number(o.total))) {
      this.err.set('Amount received is less than the order total');
      return;
    }
    this.busyId.set(o.id);
    this.err.set('');
    this.api.patch('/orders/' + o.id + '/payment', { amount_received: amount }).subscribe({
      next: (r: any) => {
        this.busyId.set(null);
        delete this.cash[o.id];
        this.flash('Payment received for ' + this.ref(o.id) + '. Change: ' + this.money(r?.change || 0));
        this.load();
      },
      error: (e: any) => {
        this.busyId.set(null);
        this.err.set(this.errMsg(e));
      },
    });
  }

  // ---- helpers used by the template ----
  next(o: any) {
    return NEXT[o.status] || null;
  }
  canPay(o: any) {
    return ACTIVE.includes(o.status) && o.payment_status !== 'Paid';
  }
  exact(o: any) {
    this.cash[o.id] = Number(o.total);
  }
  enough(o: any) {
    const c = this.cash[o.id];
    return c !== null && c !== undefined && Number(c) >= Number(o.total);
  }
  change(o: any) {
    return Math.round((Number(this.cash[o.id]) - Number(o.total)) * 100) / 100;
  }
  ref(id: number) {
    return '#MHK-' + (1000 + id);
  }
  money(n: any) {
    return 'PHP ' + Number(n || 0).toFixed(2);
  }
  typeLabel(t: string) {
    return t === 'dine_in' ? 'Dine-in' : 'Pick-up';
  }
  when(s: string) {
    const d = new Date(s);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  private byTime(list: any[]) {
    return [...list].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }
  private flash(text: string) {
    this.msg.set(text);
    setTimeout(() => this.msg.set(''), 5000);
  }
  private errMsg(e: any) {
    return e?.error?.message || e?.message || 'Something went wrong';
  }
}