import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ref } from '../core/config';

const PER_PAGE = 5;

@Component({
  selector: 'app-my-orders',
  imports: [FormsModule, CurrencyPipe, DatePipe, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>Your meals, past and upcoming.</h1>
        <p class="sub">Only your orders are shown here. Follow a current meal or revisit an old favorite.</p>
      </div>
      <a class="btn" routerLink="/customer/menu">Order something good</a>
    </div>
    @if (err()) { <div class="alert err">{{ err() }}</div> }

    <div class="filters">
      <input class="grow" type="search" placeholder="Search your order reference or item…" [ngModel]="q()" (ngModelChange)="q.set($event); page.set(1)" />
      <select [ngModel]="status()" (ngModelChange)="status.set($event); page.set(1)"><option value="">All statuses</option>@for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }</select>
      <select [ngModel]="type()" (ngModelChange)="type.set($event); page.set(1)"><option value="">All types</option><option value="pickup">Pickup</option><option value="dine_in">Dine-in</option></select>
      <select [ngModel]="month()" (ngModelChange)="month.set($event); page.set(1)"><option value="">All months</option>@for (m of months(); track m.key) { <option [value]="m.key">{{ m.label }}</option> }</select>
    </div>

    <div class="panel">
      <div class="page-head" style="margin-bottom:0"><h2>Your order history</h2><span class="chip">{{ auth.user()?.name }} · {{ filtered().length }} {{ filtered().length === 1 ? 'order' : 'orders' }}</span></div>
      @for (o of pageRows(); track o.id) {
        <div class="hist">
          <div><b>{{ ref(o.id) }}</b><small>{{ o.scheduled_at | date: 'd MMM y' }}</small><small>{{ o.scheduled_at | date: 'h:mm a' }} · {{ o.order_type === 'pickup' ? 'Pickup' : 'Dine-in' }}</small></div>
          <div>{{ summary(o) }}<small [style.color]="o.status === 'Completed' ? 'var(--green)' : ''">{{ pointsText(o) }}</small></div>
          <div><b style="font-size:1.1rem">{{ o.total | currency: 'PHP' }}</b><br /><span class="st" [class]="'st st-' + o.status.toLowerCase()">{{ o.status }}</span></div>
          <div class="right">
            <a class="link" [routerLink]="['/customer/orders', o.id]">View details →</a>
            @if (o.status === 'Completed') { <a class="link plain" style="color:var(--accent)" routerLink="/customer/reviews">Review your items</a> }
          </div>
        </div>
      } @empty {
        <div class="empty">No orders match. <a routerLink="/customer/menu">Place your first order →</a></div>
      }
      <div class="pager" style="padding:.8rem 0 0">
        <span>Showing {{ pageRows().length }} of {{ filtered().length }} orders · Newest first</span>
        <span style="margin-left:auto">
          <button class="link" [disabled]="page() <= 1" (click)="page.set(page() - 1)">← Previous</button> &nbsp;{{ page() }} / {{ pages() }}&nbsp;
          <button class="link" [disabled]="page() >= pages()" (click)="page.set(page() + 1)">Next →</button>
        </span>
      </div>
    </div>
  `,
})
export class MyOrdersComponent implements OnInit {
  private api = inject(Api);
  auth = inject(AuthService);
  ref = ref;
  statuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Rejected', 'Cancelled'];
  orders = signal<any[]>([]);
  err = signal('');
  q = signal(''); status = signal(''); type = signal(''); month = signal(''); page = signal(1);

  months = computed(() => {
    const keys = [...new Set(this.orders().map((o) => String(o.scheduled_at).slice(0, 7)))].sort().reverse();
    return keys.map((key) => ({ key, label: new Date(key + '-01T00:00:00').toLocaleString('en', { month: 'long', year: 'numeric' }) }));
  });
  filtered = computed(() => {
    const q = this.q().toLowerCase().trim();
    return this.orders().filter((o) =>
      (!q || ref(o.id).toLowerCase().includes(q) || o.items.some((i: any) => i.name.toLowerCase().includes(q))) &&
      (!this.status() || o.status === this.status()) && (!this.type() || o.order_type === this.type()) &&
      (!this.month() || String(o.scheduled_at).startsWith(this.month())));
  });
  pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PER_PAGE)));
  pageRows = computed(() => this.filtered().slice((this.page() - 1) * PER_PAGE, this.page() * PER_PAGE));

  ngOnInit() { this.api.get('/orders/mine').subscribe({ next: (r) => this.orders.set(r), error: (e) => this.err.set(errMsg(e)) }); }
  summary(o: any) { return o.items.map((i: any) => `${i.quantity} ${i.name}`).join(' · '); }
  pointsText(o: any) {
    if (o.status === 'Completed') return `+${o.points_earned} points earned`;
    if (o.status === 'Cancelled' || o.status === 'Rejected') return 'No points earned';
    return `${o.points_estimate} points pending`;
  }
}
