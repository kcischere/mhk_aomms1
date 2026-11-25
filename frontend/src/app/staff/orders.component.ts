import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../core/api.service';

const PER_PAGE = 10;

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="history">
      <div class="bar">
        <h2>All orders</h2>
        <div class="search">
          <input type="search" placeholder="Search order #, name or email" [(ngModel)]="q" (keyup.enter)="load()" />
          <button class="btn ghost" (click)="load()">Search</button>
        </div>
      </div>

      @if (err()) { <div class="note bad">{{ err() }}</div> }

      <div class="summary">
        <div><span>Orders</span><b>{{ filtered().length }}</b></div>
        <div><span>Completed</span><b>{{ completedCount() }}</b></div>
        <div><span>Vouchers used</span><b>{{ voucherCount() }}</b></div>
        <div><span>Total discounts</span><b>{{ money(discountTotal()) }}</b></div>
        <div><span>Completed sales</span><b>{{ money(salesTotal()) }}</b></div>
      </div>

      <div class="filters">
        <select [ngModel]="status()" (ngModelChange)="status.set($event); page.set(1)">
          <option value="">All statuses</option>
          @for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }
        </select>
        <select [ngModel]="type()" (ngModelChange)="type.set($event); page.set(1)">
          <option value="">All types</option>
          <option value="pickup">Pick-up</option>
          <option value="dine_in">Dine-in</option>
        </select>
        <label class="chk">
          <input type="checkbox" [ngModel]="voucherOnly()" (ngModelChange)="voucherOnly.set($event); page.set(1)" />
          Voucher used only
        </label>
      </div>

      @if (pageRows().length === 0) {
        <p class="empty">{{ loading() ? 'Loading orders...' : 'No orders match.' }}</p>
      }

      @for (o of pageRows(); track o.id) {
        <article class="card">
          <header>
            <div>
              <strong>{{ ref(o.id) }}</strong>
              <span class="badge" [attr.data-status]="o.status">{{ o.status }}</span>
              @if (o.payment_status === 'Paid') { <span class="badge paid">Paid</span> }
              @else if (isActive(o.status)) { <span class="badge unpaid">Unpaid</span> }
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
            @if (hasVoucher(o)) {
              <div class="voucher"><span>Voucher {{ o.voucher_code }}</span><span>-{{ money(o.discount) }}</span></div>
            }
            <div class="grand"><span>Total</span><span>{{ money(o.total) }}</span></div>
            @if (o.payment_status === 'Paid') {
              <div><span>Received</span><span>{{ money(o.amount_received) }}</span></div>
              @if (changeOf(o) > 0) {
                <div><span>Change</span><span>{{ money(changeOf(o)) }}</span></div>
              }
            }
          </div>
        </article>
      }

      @if (filtered().length > PER_PAGE) {
        <div class="pager">
          <span>Showing {{ pageRows().length }} of {{ filtered().length }} orders &middot; Newest first</span>
          <span>
            <button class="btn ghost" [disabled]="page() <= 1" (click)="page.set(page() - 1)">&larr; Previous</button>
            <span class="pg">{{ page() }} / {{ pages() }}</span>
            <button class="btn ghost" [disabled]="page() >= pages()" (click)="page.set(page() + 1)">Next &rarr;</button>
          </span>
        </div>
      }
    </div>
  `,
  styles: [`
    .history { background: #f7f5f2; color: #222; border-radius: 12px; padding: 20px; max-width: 980px; margin: 0 auto; }
    .bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    .bar h2 { margin: 0; font-size: 22px; }
    .search { display: flex; gap: 8px; }
    .search input { min-width: 240px; padding: 8px 10px; border: 1px solid #cfc9c0; border-radius: 8px; background: #fff; color: #222; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 14px; }
    .summary div { background: #fff; border: 1px solid #e3ddd3; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
    .summary span { color: #777; font-size: 12px; }
    .summary b { font-size: 18px; }
    .filters { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 16px; }
    .filters select { padding: 8px 10px; border: 1px solid #cfc9c0; border-radius: 8px; background: #fff; color: #222; }
    .chk { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; }
    .note { padding: 10px 12px; border-radius: 8px; margin-bottom: 10px; }
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
    .totals .voucher { color: #c8102e; font-weight: 600; }
    .grand { font-weight: 700; font-size: 16px; }
    .notes { font-size: 13px; background: #faf7f0; padding: 6px 8px; border-radius: 6px; margin-bottom: 8px; }
    .pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; color: #777; font-size: 13px; }
    .pg { margin: 0 8px; }
    .btn { padding: 8px 14px; border-radius: 8px; border: 1px solid transparent; cursor: pointer; font-weight: 600; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn.ghost { background: #fff; color: #222; border-color: #cfc9c0; }
  `],
})
export class OrdersComponent implements OnInit {
  private api = inject(Api);

  readonly PER_PAGE = PER_PAGE;
  readonly statuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Rejected', 'Cancelled'];

  orders = signal<any[]>([]);
  loading = signal(true);
  err = signal('');
  q = '';
  status = signal('');
  type = signal('');
  voucherOnly = signal(false);
  page = signal(1);

  filtered = computed(() =>
    this.orders()
      .filter((o) =>
        (!this.status() || o.status === this.status()) &&
        (!this.type() || o.order_type === this.type()) &&
        (!this.voucherOnly() || this.hasVoucher(o))
      )
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
  );
  pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PER_PAGE)));
  pageRows = computed(() => this.filtered().slice((this.page() - 1) * PER_PAGE, this.page() * PER_PAGE));

  completedCount = computed(() => this.filtered().filter((o) => o.status === 'Completed').length);
  voucherCount = computed(() => this.filtered().filter((o) => this.hasVoucher(o)).length);
  discountTotal = computed(() =>
    this.filtered().filter((o) => o.status === 'Completed' && this.hasVoucher(o)).reduce((s, o) => s + Number(o.discount), 0)
  );
  salesTotal = computed(() =>
    this.filtered().filter((o) => o.status === 'Completed').reduce((s, o) => s + Number(o.total || 0), 0)
  );

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.err.set('');
    const qs = 'limit=200&sort=desc' + (this.q.trim() ? '&q=' + encodeURIComponent(this.q.trim()) : '');
    this.api.get('/orders?' + qs).subscribe({
      next: (r: any) => {
        this.orders.set(r.rows || []);
        this.page.set(1);
        this.loading.set(false);
      },
      error: (e: any) => {
        this.err.set(e?.error?.message || e?.message || 'Something went wrong');
        this.loading.set(false);
      },
    });
  }

  // ---- helpers used by the template ----
  hasVoucher(o: any) {
    return !!o.voucher_code && Number(o.discount) > 0;
  }
  isActive(status: string) {
    return ['Confirmed', 'Preparing', 'Ready'].includes(status);
  }
  changeOf(o: any) {
    return Math.round((Number(o.amount_received || 0) - Number(o.total || 0)) * 100) / 100;
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
      : d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
}