import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Api, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { img, ref } from '../core/config';

const ALL = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled', 'Rejected'];
const NEXT: Record<string, string[]> = {
  Pending: ['Confirmed', 'Rejected', 'Cancelled'],
  Confirmed: ['Preparing', 'Cancelled'],
  Preparing: ['Ready', 'Cancelled'],
  Ready: ['Completed', 'Cancelled'],
};

// Shared by the Administrator and the Cashier.
@Component({
  selector: 'app-orders',
  imports: [FormsModule, CurrencyPipe, DatePipe],
  template: `
    <p class="eyebrow">{{ isAdmin() ? 'Administrator' : 'Cashier' }} / Orders</p>
    <h1>Keep every meal on track.</h1>
    <p class="sub">View all customers’ orders, open the details, confirm or reject new orders, receive payment and update kitchen progress.</p>
    @if (err()) { <div class="alert err">{{ err() }}</div> }
    @if (msg()) { <div class="alert ok">{{ msg() }}</div> }

    <div class="filters">
      <input class="grow" type="search" placeholder="Search order reference or customer…" [(ngModel)]="q" (ngModelChange)="reload()" />
      <select [(ngModel)]="status" (ngModelChange)="reload()"><option value="">All statuses</option>@for (s of all; track s) { <option [value]="s">{{ s }}</option> }</select>
      <select [(ngModel)]="type" (ngModelChange)="reload()"><option value="">All types</option><option value="pickup">Pickup</option><option value="dine_in">Dine-in</option></select>
      <select [(ngModel)]="date" (ngModelChange)="reload()"><option value="">All dates</option><option value="today">Today</option><option value="upcoming">Upcoming</option><option value="past">Past</option></select>
    </div>

    <div class="split">
      <section>
        <div class="panel flush">
          <div style="padding:1.1rem 1.3rem .2rem"><h2>All orders</h2></div>
          <div class="olist">
            @for (o of rows(); track o.id) {
              <button class="orow" [class.sel]="selected()?.id === o.id" (click)="select(o)">
                <span><b>{{ ref(o.id) }}</b><small>{{ o.customer_name }}</small><span class="sel-tag">{{ selected()?.id === o.id ? 'Selected →' : 'View details →' }}</span></span>
                <span><b style="font-weight:500">{{ o.scheduled_at | date: 'd MMM · h:mm a' }}</b><small>{{ o.order_type === 'pickup' ? 'Pickup' : 'Dine-in' }}</small></span>
                <b>{{ o.total | currency: 'PHP' : 'symbol' : '1.0-0' }}</b>
                <span class="st" [class]="'st st-' + o.status.toLowerCase()">{{ o.status }}</span>
              </button>
            } @empty { <div class="empty">No orders match these filters.</div> }
          </div>
          <div class="pager">
            <span>{{ total() }} orders · Page {{ page() }} of {{ pages() }}</span>
            <button class="link" [disabled]="page() <= 1" (click)="go(-1)">Previous</button> /
            <button class="link" [disabled]="page() >= pages()" (click)="go(1)">Next →</button>
          </div>
        </div>
        <div class="note"><b>Sales activity, not online collections</b>Only Completed orders contribute to completed-order sales. Customers pay at pickup or in the restaurant.</div>
      </section>

      @if (selected(); as o) {
        <aside class="panel detail">
          <div class="top">
            <div><h2>{{ ref(o.id) }}</h2><p class="hint" style="margin:0">Placed {{ o.created_at | date: 'd MMM y · h:mm a' }}</p></div>
            <span class="st" [class]="'st st-' + o.status.toLowerCase()">{{ o.status }}</span>
          </div>
          <hr />
          <b>{{ o.customer_name }}</b>
          <p class="hint" style="margin-top:0">{{ o.customer_email }}</p>
          <div class="kv"><span>Schedule</span><span>{{ o.scheduled_at | date: 'd MMM y · h:mm a' }}</span></div>
          <div class="kv"><span>Order type</span><span>{{ o.order_type === 'pickup' ? 'Pickup' : 'Dine-in' }}</span></div>
          <div class="kv"><span>Payment</span><span class="st" [class]="'st b-' + o.payment_status.toLowerCase()">{{ o.payment_status }}</span></div>
          <hr />
          @for (i of o.items; track $index) {
            <div class="line">
              @if (i.image_url) { <img class="thumb" [src]="photo(i.image_url)" [alt]="i.name" /> } @else { <span class="thumb">–</span> }
              <div><b>{{ i.name }}</b><small>{{ i.price | currency: 'PHP' }} × {{ i.quantity }}</small></div>
              <span class="amt">{{ i.price * i.quantity | currency: 'PHP' }}</span>
            </div>
          }
          @if (o.notes) { <div class="note" style="margin:.6rem 0"><b>Customer note</b>{{ o.notes }}</div> }
          @if (o.reject_reason) { <div class="note" style="margin:.6rem 0"><b>Rejected because</b>{{ o.reject_reason }}</div> }
          <hr />
          <div class="kv"><span>Subtotal</span><span>{{ o.subtotal | currency: 'PHP' }}</span></div>
          @if (o.discount > 0) { <div class="kv"><span>Voucher{{ o.voucher_code ? ' · ' + o.voucher_code : '' }}</span><span>−{{ o.discount | currency: 'PHP' }}</span></div> }
          <hr />
          <div class="total"><span>Total to pay</span><b>{{ o.total | currency: 'PHP' }}</b></div>
          <div class="kv" style="margin-top:.6rem"><span>Order points</span><span>{{ o.status === 'Completed' ? o.points_earned + ' earned' : 'Awarded when Completed' }}</span></div>

          @if (canPay(o)) {
            <hr />
            <h2 style="font-size:1rem">Receive payment</h2>
            <div class="actions">
              <input type="number" min="0" step="0.01" style="width:140px" [ngModel]="pay()" (ngModelChange)="pay.set(+$event)" aria-label="Amount received" />
              <button class="btn" (click)="receive(o)">Receive payment</button>
            </div>
            <p class="hint">Enter the cash received. The change to give back is shown after saving.</p>
          }

          @if (options(o).length) {
            <hr />
            <h2 style="font-size:1rem">Update order status</h2>
            <div class="statuses">
              @for (s of all; track s) {
                <button class="tab" [class.on]="chosen() === s" [disabled]="!options(o).includes(s)" (click)="chosen.set(s)">{{ s }}</button>
              }
            </div>
            <p class="hint">Current: {{ o.status }}{{ chosen() ? ' → Selected: ' + chosen() : '' }}.</p>
            <button class="btn block" style="margin-top:.7rem" [disabled]="!chosen()" (click)="update(o)">{{ chosen() ? 'Update status to ' + chosen() : 'Choose a status' }}</button>
            <p class="hint">Mark Completed only after the meal is collected or served and payment is received. Rejected and Cancelled orders earn no points.</p>
          }
        </aside>
      } @else {
        <aside class="panel empty">Select an order to see its details.</aside>
      }
    </div>
  `,
})
export class OrdersComponent implements OnInit, OnDestroy {
  private api = inject(Api);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  isAdmin = computed(() => this.auth.user()?.role === 'admin');
  ref = ref;
  photo = img;
  all = ALL;
  rows = signal<any[]>([]);
  total = signal(0);
  page = signal(1);
  selected = signal<any | null>(null);
  chosen = signal('');
  pay = signal(0);
  err = signal('');
  msg = signal('');
  q = ''; status = ''; type = ''; date = '';
  private limit = 6;
  private timer: any;
  private wanted = 0;
  pages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit)));

  ngOnInit() {
    this.wanted = Number(this.route.snapshot.queryParamMap.get('order')) || 0;
    this.load();
    this.timer = setInterval(() => this.load(), 20000); // pick up new orders automatically
  }
  ngOnDestroy() { clearInterval(this.timer); }

  reload() { this.page.set(1); this.load(); }
  go(d: number) { this.page.set(Math.min(this.pages(), Math.max(1, this.page() + d))); this.load(); }

  load() {
    this.api.get('/orders', { q: this.q, status: this.status, type: this.type, date: this.date, page: this.page(), limit: this.limit }).subscribe({
      next: (r) => {
        this.rows.set(r.rows);
        this.total.set(r.total);
        const keep = this.selected() ? r.rows.find((o: any) => o.id === this.selected()!.id) : null;
        const want = this.wanted ? r.rows.find((o: any) => o.id === this.wanted) : null;
        this.wanted = 0;
        this.select(want ?? keep ?? r.rows[0] ?? null, !!keep && !want);
      },
      error: (e) => this.err.set(errMsg(e)),
    });
  }

  select(o: any | null, keepChoice = false) {
    const changed = o?.id !== this.selected()?.id;
    this.selected.set(o);
    if (!keepChoice) this.chosen.set('');
    if (o && changed) this.pay.set(Number(o.total));
  }

  options(o: any) { return NEXT[o.status] ?? []; }
  canPay(o: any) { return ['Confirmed', 'Preparing', 'Ready'].includes(o.status) && o.payment_status === 'Unpaid'; }

  private flash(text: string) { this.msg.set(text); this.err.set(''); setTimeout(() => this.msg.set(''), 6000); }

  update(o: any) {
    const status = this.chosen();
    let reason: string | undefined;
    if (status === 'Rejected') {
      reason = (prompt(`Why are you rejecting ${ref(o.id)}? The customer will see this.`) ?? '').trim();
      if (!reason) return;
    }
    if (status === 'Cancelled' && !confirm(`Cancel ${ref(o.id)}?`)) return;
    this.api.patch(`/orders/${o.id}/status`, { status, reason }).subscribe({
      next: () => { this.flash(`${ref(o.id)} is now ${status}.`); this.chosen.set(''); this.load(); },
      error: (e) => this.err.set(errMsg(e)),
    });
  }

  receive(o: any) {
    this.api.patch(`/orders/${o.id}/payment`, { amount_received: this.pay() }).subscribe({
      next: (r) => { this.flash(`Payment received for ${ref(o.id)}. Change to give: ₱${Number(r.change).toFixed(2)}`); this.load(); },
      error: (e) => this.err.set(errMsg(e)),
    });
  }
}
