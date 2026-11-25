import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { img, ref } from '../core/config';

const STEPS = [
  { label: 'Pending', sub: 'Received by the kitchen' },
  { label: 'Preparing', sub: 'Kitchen starts cooking' },
  { label: 'Ready', sub: 'Ready for your visit' },
  { label: 'Completed', sub: 'Meal collected / served' },
];
const INDEX: Record<string, number> = { Pending: 1, Confirmed: 1, Preparing: 2, Ready: 3, Completed: 4 };

@Component({
  selector: 'app-order-detail',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <a class="back" routerLink="/customer/orders">← Back to my orders</a>
    @if (err()) { <div class="alert err">{{ err() }}</div> }
    @if (order(); as o) {
      <div class="page-head">
        <div>
          <h1>{{ placed ? 'Salamat, ' + firstName() + '! Your order is in.' : 'Order ' + ref(o.id) }}</h1>
          <p class="sub">Order {{ ref(o.id) }} · Placed {{ o.created_at | date: 'd MMM y · h:mm a' }}</p>
        </div>
        <a class="btn ghost" routerLink="/customer/menu">Back to menu</a>
      </div>

      @if (placed) {
        <div class="note ok"><b>Confirmation sent to {{ auth.user()?.email }}</b>We’ll email you when your order status changes. Pay {{ o.total | currency: 'PHP' }} when you {{ o.order_type === 'pickup' ? 'pick up' : 'dine in' }}.</div>
      }

      <div class="panel" style="margin-bottom:1.1rem">
        <h2>Follow your meal</h2>
        <div class="steps" style="margin-top:.8rem">
          @for (s of steps; track s.label; let i = $index) {
            <div class="step" [class.on]="stepIndex(o) === i + 1" [class.done]="stepIndex(o) > i + 1">
              <span class="num">{{ stepIndex(o) > i + 1 ? '✓' : i + 1 }}</span>
              <div><b>{{ s.label }}</b><small>{{ i === 0 && o.status === 'Confirmed' ? 'Confirmed by the kitchen' : s.sub }}</small></div>
            </div>
          }
        </div>
        <hr style="border:0;border-top:1px solid var(--line);margin:1rem 0" />
        @if (o.status === 'Cancelled' || o.status === 'Rejected') {
          <div class="alert err" style="margin:0"><b>{{ o.status }}</b> — {{ o.status === 'Rejected' ? 'The kitchen could not accept this order' + (o.reject_reason ? ': ' + o.reject_reason : '.') : 'This order was cancelled.' }} Cancelled orders earn no points.</div>
        } @else {
          <p class="hint" style="margin:0"><span class="st st-cancelled">Cancelled</span> is a separate end state if the kitchen cancels an order. Cancelled orders do not continue through the steps and earn no points.</p>
        }
      </div>

      <div class="twocol">
        <div class="stack">
          <div class="panel">
            <h2>Your meal</h2>
            @for (i of o.items; track $index) {
              <div class="line">
                @if (i.image_url) { <img class="thumb" [src]="photo(i.image_url)" [alt]="i.name" /> } @else { <span class="thumb">–</span> }
                <div><b>{{ i.name }}</b><small>{{ i.price | currency: 'PHP' }} × {{ i.quantity }}</small></div>
                <span class="amt">{{ i.price * i.quantity | currency: 'PHP' }}</span>
              </div>
            }
          </div>
          <div class="panel">
            <h2>Your visit</h2>
            <div class="kv"><span>Order type</span><span>{{ o.order_type === 'pickup' ? 'Pickup' : 'Dine-in' }}</span></div>
            <div class="kv"><span>Schedule</span><span>{{ o.scheduled_at | date: 'd MMM y · h:mm a' }}</span></div>
            <div class="kv"><span>Location</span><span>Mr. Hungry Kitchen</span></div>
            @if (o.notes) { <p class="hint">Your note: {{ o.notes }}</p> }
          </div>
        </div>
        <div class="stack">
          <div class="panel">
            <h2>Amount due at pickup</h2>
            <div class="kv"><span>Subtotal</span><span>{{ o.subtotal | currency: 'PHP' }}</span></div>
            @if (o.discount > 0) { <div class="kv"><span>Voucher{{ o.voucher_code ? ' · ' + o.voucher_code : '' }}</span><span>−{{ o.discount | currency: 'PHP' }}</span></div> }
            <hr style="border:0;border-top:1px solid var(--line);margin:.8rem 0" />
            <div class="total"><span>Total to pay</span><b>{{ o.total | currency: 'PHP' }}</b></div>
            <p style="margin:.8rem 0 .4rem"><span class="st" [class]="'st b-' + o.payment_status.toLowerCase()">{{ o.payment_status === 'Paid' ? 'Paid' : 'Unpaid · pay at the kitchen' }}</span></p>
            @if (o.voucher_code) { <p class="hint">Voucher {{ o.voucher_code }} applied. No additional points were deducted at checkout.</p> }
          </div>
          <div class="note">
            @if (o.status === 'Completed') {
              <b>{{ o.points_earned }} points were added</b>Thank you for dining with us. See your balance and history under Rewards.
            } @else if (o.status === 'Cancelled' || o.status === 'Rejected') {
              <b>No points for this order</b>Cancelled and rejected orders earn no points.
            } @else {
              <b>{{ o.points_estimate }} points are on the way</b>Pending only. Points are added after staff marks this order Completed.
            }
            <p style="margin-top:.6rem"><a class="link" routerLink="/customer/rewards">View rewards &amp; points history →</a></p>
          </div>
          @if (o.status === 'Completed') { <a class="btn" routerLink="/customer/reviews">Review your items</a> }
        </div>
      </div>
    }
  `,
})
export class OrderDetailComponent implements OnInit, OnDestroy {
  private api = inject(Api);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);
  ref = ref; photo = img; steps = STEPS;
  order = signal<any>(null);
  err = signal('');
  placed = this.route.snapshot.queryParamMap.get('placed') === '1';
  private timer: any;

  ngOnInit() {
    this.load();
    this.timer = setInterval(() => this.load(), 15000); // keeps the tracker up to date
  }
  ngOnDestroy() { clearInterval(this.timer); }
  load() {
    this.api.get(`/orders/${this.route.snapshot.paramMap.get('id')}`).subscribe({ next: (r) => this.order.set(r), error: (e) => this.err.set(errMsg(e)) });
  }
  firstName() { return (this.auth.user()?.name ?? '').split(' ')[0]; }
  stepIndex(o: any) { return INDEX[o.status] ?? 0; }
}
