import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api, errMsg } from '../core/api.service';
import { ref } from '../core/config';

const TABS = [
  { label: 'Pending', statuses: ['Pending', 'Confirmed'] },
  { label: 'Preparing', statuses: ['Preparing'] },
  { label: 'Ready', statuses: ['Ready'] },
  { label: 'Completed', statuses: ['Completed'] },
  { label: 'Cancelled', statuses: ['Cancelled', 'Rejected'] },
];

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>A good day starts in the kitchen.</h1>
        <p class="sub">Today’s scheduled orders and completed-order sales at a glance.</p>
      </div>
      <a class="btn" routerLink="/admin/orders">Manage orders →</a>
    </div>
    @if (err()) { <div class="alert err">{{ err() }}</div> }

    @if (stats(); as s) {
      <div class="stats">
        <div class="stat"><span>Scheduled for today</span><b>{{ s.scheduled }} orders</b><small>{{ s.pickup }} pickup · {{ s.dineIn }} dine-in</small></div>
        <div class="stat"><span>In progress</span><b>{{ s.inProgress }} orders</b><small>{{ s.pending }} pending · {{ s.preparing }} preparing · {{ s.ready }} ready</small></div>
        <div class="stat"><span>Completed orders</span><b>{{ s.completed }} orders</b><small>Points awarded after completion</small></div>
        <div class="stat"><span>Completed-order sales</span><b>{{ s.sales | currency: 'PHP' : 'symbol' : '1.0-0' }}</b><small>Discounted order totals · today</small></div>
      </div>

      @if (s.unavailable.length) {
        <div class="note">
          <b>{{ s.unavailable.length }} menu {{ s.unavailable.length === 1 ? 'item is' : 'items are' }} unavailable</b>
          {{ s.unavailable.slice(0, 3).join(', ') }} {{ s.unavailable.length === 1 ? 'is' : 'are' }} not available to order. Review availability before the next service.
          <p><a class="link" routerLink="/admin/menu">Open menu management →</a></p>
        </div>
      }

      <div class="grid-main">
        <div class="panel">
          <h2>Completed-order sales activity</h2>
          @if (s.chart.length) {
            <div class="bars">
              @for (b of s.chart; track b.label) {
                <div class="bar"><span>{{ b.total | currency: 'PHP' : 'symbol' : '1.0-0' }}</span><i [style.height.%]="barHeight(b.total, s.chart)"></i><span>{{ b.label }}</span></div>
              }
            </div>
          } @else {
            <div class="empty">No completed orders yet today.</div>
          }
          <p class="hint">Based on Completed orders, after voucher discounts. This is sales activity, not online payment receipts; customers pay at the restaurant.</p>
        </div>
        <div class="panel quick">
          <h2>Quick actions</h2>
          <a routerLink="/admin/menu"><div><b>Menu management</b><small>Update dishes &amp; availability</small></div><span class="link">→</span></a>
          <a routerLink="/admin/orders"><div><b>Orders management</b><small>Follow today’s schedule</small></div><span class="link">→</span></a>
          <a routerLink="/admin/loyalty"><div><b>Loyalty settings</b><small>Manage points &amp; vouchers</small></div><span class="link">→</span></a>
          <a routerLink="/admin/reviews"><div><b>Review moderation</b><small>Care for customer feedback</small></div><span class="link">→</span></a>
        </div>
      </div>
    }

    <div class="panel">
      <h2>Upcoming scheduled orders</h2>
      <div class="tabs">
        @for (t of tabs; track t.label) {
          <button class="tab" [class.on]="tab() === t.label" (click)="tab.set(t.label)">{{ t.label }} · {{ count(t.statuses) }}</button>
        }
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Schedule</th><th>Order</th><th>Customer</th><th>Type</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            @for (o of visible(); track o.id) {
              <tr>
                <td><b>{{ o.scheduled_at | date: 'h:mm a' }} · {{ dayLabel(o.scheduled_at) }}</b></td>
                <td>{{ ref(o.id) }}</td>
                <td>{{ o.customer_name }}</td>
                <td>{{ o.order_type === 'pickup' ? 'Pickup' : 'Dine-in' }}</td>
                <td>{{ o.total | currency: 'PHP' }}</td>
                <td>{{ o.status }}</td>
                <td><a class="link" [routerLink]="['/admin/orders']" [queryParams]="{ order: o.id }">View →</a></td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="empty">No {{ tab().toLowerCase() }} orders scheduled for today or later.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(Api);
  ref = ref;
  tabs = TABS;
  stats = signal<any>(null);
  orders = signal<any[]>([]);
  tab = signal('Pending');
  err = signal('');

  visible = computed(() => {
    const t = TABS.find((x) => x.label === this.tab());
    return this.orders().filter((o) => t?.statuses.includes(o.status)).slice(0, 8);
  });

  ngOnInit() {
    this.api.get('/stats').subscribe({ next: (r) => this.stats.set(r), error: (e) => this.err.set(errMsg(e)) });

    // No date filter on the request, so future orders come back too.
    // Newest first so the limit never cuts off upcoming orders, then we keep
    // only today and later and sort them soonest first.
    this.api.get('/orders', { sort: 'desc', limit: 200 }).subscribe({
      next: (r) => {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const upcoming = (r.rows || [])
          .filter((o: any) => new Date(o.scheduled_at).getTime() >= startOfToday.getTime())
          .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
        this.orders.set(upcoming);
      },
      error: (e) => this.err.set(errMsg(e)),
    });
  }

  count(statuses: string[]) { return this.orders().filter((o) => statuses.includes(o.status)).length; }
  barHeight(v: number, chart: any[]) { return Math.max(4, (v / Math.max(...chart.map((c: any) => c.total), 1)) * 80); }

  dayLabel(s: string) {
    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}