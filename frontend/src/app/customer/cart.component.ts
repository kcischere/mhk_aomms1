import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api, errMsg } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CartService } from '../core/cart.service';
import { img } from '../core/config';

const SLOTS = (() => {
  const out: { value: string; label: string }[] = [];
  for (let h = 10; h <= 20; h++) for (const m of [0, 30]) {
    if (h === 20 && m === 30) continue;
    out.push({ value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, label: `${((h + 11) % 12) + 1}:${m ? '30' : '00'} ${h < 12 ? 'AM' : 'PM'}` });
  }
  return out;
})();

@Component({
  selector: 'app-cart',
  imports: [FormsModule, CurrencyPipe, RouterLink],
  template: `
    <h1>Your next meal, all set.</h1>
    <p class="sub">Review your cart and tell us when to get cooking.</p>
    @if (err()) { <div class="alert err">{{ err() }}</div> }

    @if (!cart.lines().length) {
      <div class="panel empty" style="margin-top:1rem">Your cart is empty. <a routerLink="/customer/menu">Browse the menu →</a></div>
    } @else {
      <div class="twocol" style="margin-top:1.2rem">
        <div class="stack">
          <div class="panel">
            <h2>Your cart · {{ cart.count() }} {{ cart.count() === 1 ? 'item' : 'items' }}</h2>
            @for (l of cart.lines(); track l.id) {
              <div class="cart-line">
                @if (imgOf(l)) { <img class="thumb" [src]="photo(imgOf(l))" [alt]="l.name" /> } @else { <span class="thumb">–</span> }
                <div class="info">
                  <b>{{ l.name }}</b><small>{{ l.price | currency: 'PHP' }} each</small>
                  @if (isGone(l.id)) { <small style="color:var(--red)"> · No longer available</small> }
                  <br /><button class="link" (click)="cart.remove(l.id)">Remove</button>
                </div>
                <span class="stepper"><button (click)="cart.setQty(l.id, l.qty - 1)" aria-label="Fewer">−</button><span>{{ l.qty }}</span><button (click)="cart.setQty(l.id, l.qty + 1)" aria-label="More">+</button></span>
                <b style="min-width:80px;text-align:right">{{ l.price * l.qty | currency: 'PHP' }}</b>
              </div>
            }
          </div>

          <div class="panel">
            <h2>How would you like your meal?</h2>
            <div class="tabs">
              <button class="tab" [class.on]="orderType() === 'pickup'" (click)="orderType.set('pickup')">● Pickup</button>
              <button class="tab" [class.on]="orderType() === 'dine_in'" (click)="orderType.set('dine_in')">○ Dine-in</button>
            </div>
            <p class="hint">Pickup at Mr. Hungry Kitchen. Dine-in is a meal pre-order, not a table reservation.</p>
            <div class="row">
              <div><label>Scheduled date</label><input type="date" [min]="today" [(ngModel)]="date" /></div>
              <div><label>Scheduled time</label><select [(ngModel)]="time">@for (s of slots; track s.value) { <option [value]="s.value">{{ s.label }}</option> }</select></div>
            </div>
            <label>Order notes (optional)</label>
            <textarea rows="3" [(ngModel)]="notes" placeholder="e.g. Please pack the sauce separately."></textarea>
            <p class="hint">Let the kitchen know about simple preparation or packing requests.</p>
          </div>

          @if (unavailable().length) {
            <div class="panel">
              <h2>If an item becomes unavailable</h2>
              <div class="alert err">
                <b>{{ unavailable()[0].name }}{{ unavailable().length > 1 ? ' and ' + (unavailable().length - 1) + ' more are' : ' is' }} now unavailable</b><br />
                Remove {{ unavailable().length > 1 ? 'these items' : 'this item' }} before placing your order. Your available items stay in your cart.
                <br /><button class="link" (click)="removeUnavailable()">Remove unavailable {{ unavailable().length > 1 ? 'items' : 'item' }}</button>
              </div>
            </div>
          }
        </div>

        <div class="stack">
          <div class="panel">
            <h2>A little reward for you</h2>
            <div class="kv"><span>Your points balance</span><b style="color:var(--accent)">{{ points() }} points</b></div>
            <label>Available voucher</label>
            <select [ngModel]="voucherId()" (ngModelChange)="voucherId.set($event)">
              <option [ngValue]="null">None (no discount)</option>
              @for (v of vouchers(); track v.id) { <option [ngValue]="v.id">{{ v.code }} · ₱{{ v.value }} off</option> }
            </select>
            @if (!vouchers().length) { <p class="hint">You don’t have a voucher to apply yet. Redeem one below with your points.</p> }
            @if (redeemMsg()) { <div class="alert ok">{{ redeemMsg() }}</div> }
            @if (redeemable().length) {
              <hr style="border:0;border-top:1px solid var(--line);margin:.9rem 0 .5rem" />
              <b style="font-size:.9rem">Redeem a voucher with your points</b>
              @for (v of redeemable(); track v.id) {
                <div class="kv" style="align-items:center">
                  <span><b>{{ v.code }}</b> · {{ v.value | currency: 'PHP' : 'symbol' : '1.0-0' }} off<br /><small class="hint">{{ v.points_cost }} points</small></span>
                  <button class="btn sm" [disabled]="points() < v.points_cost || redeeming()" (click)="redeem(v)">{{ points() < v.points_cost ? 'Not enough points' : 'Redeem' }}</button>
                </div>
              }
              <p class="hint">Redeeming deducts the points once and adds the voucher to your account. Applying it here does not deduct more points. <a routerLink="/customer/rewards">See all rewards →</a></p>
            } @else {
              <p class="hint">No vouchers are open for redemption right now. <a routerLink="/customer/rewards">See rewards →</a></p>
            }
          </div>

          <div class="panel">
            <h2>Order summary</h2>
            <div class="kv"><span>Subtotal · {{ cart.count() }} items</span><span>{{ cart.subtotal() | currency: 'PHP' }}</span></div>
            @if (discount() > 0) { <div class="kv"><span>Voucher</span><span>−{{ discount() | currency: 'PHP' }}</span></div> }
            <hr style="border:0;border-top:1px solid var(--line);margin:.8rem 0" />
            <div class="total"><span>Total to pay</span><b>{{ total() | currency: 'PHP' }}</b></div>
            <div class="note" style="margin:1rem 0"><b>Pay when you {{ orderType() === 'pickup' ? 'pick up' : 'dine in' }}</b>Pay {{ total() | currency: 'PHP' }} at the kitchen. No money is collected online. For dine-in, pay in the restaurant.</div>
            <p style="color:var(--green);font-size:.84rem;margin-bottom:.8rem">You’ll earn {{ earnPoints() }} points after this order is completed.</p>
            <button class="btn block" [disabled]="placing() || unavailable().length > 0" (click)="place()">{{ unavailable().length ? 'Place order — resolve unavailable item first' : placing() ? 'Placing order…' : 'Place order · ' + (total() | currency: 'PHP') }}</button>
            <p class="hint">Confirmation and order updates go to {{ auth.user()?.email }}.</p>
          </div>
        </div>
      </div>
    }
  `,
})
export class CartComponent implements OnInit {
  private api = inject(Api);
  private router = inject(Router);
  auth = inject(AuthService);
  cart = inject(CartService);
  photo = img;
  slots = SLOTS;
  today = new Date().toLocaleDateString('en-CA');
  date = this.today;
  time = '12:00';
  notes = '';
  orderType = signal<'pickup' | 'dine_in'>('pickup');
  menu = signal<any[]>([]);
  vouchers = signal<any[]>([]);
  catalog = signal<any[]>([]);
  redeeming = signal(false);
  redeemMsg = signal('');
  redeemable = computed(() => [...this.catalog()].sort((a, b) => a.points_cost - b.points_cost));
  voucherId = signal<number | null>(null);
  points = signal(0);
  rule = signal<any>({ points_earned: 1, per_amount: 50 });
  err = signal('');
  placing = signal(false);

  isGone = (id: number) => { const m = this.menu().find((x) => x.id === id); return this.menu().length > 0 && (!m || !m.available); };
  unavailable = computed(() => this.cart.lines().filter((l) => this.isGone(l.id)));
  voucher = computed(() => this.vouchers().find((v) => v.id === this.voucherId()));
  discount = computed(() => Math.min(Number(this.voucher()?.value ?? 0), this.cart.subtotal()));
  total = computed(() => Math.max(0, this.cart.subtotal() - this.discount()));
  earnPoints = computed(() => Math.floor(this.total() / Number(this.rule().per_amount)) * this.rule().points_earned);

  ngOnInit() {
    this.cart.reload();
    this.api.get('/menu').subscribe((m) => { this.menu.set(m); this.cart.sync(m); });
    this.api.get('/auth/me').subscribe((m) => this.points.set(m.points));
    this.api.get('/loyalty').subscribe((r) => this.rule.set(r));
    this.api.get('/vouchers/mine').subscribe({ next: (v) => this.vouchers.set(v.filter((x: any) => x.status === 'available')), error: (e) => this.err.set('Could not load your vouchers: ' + errMsg(e)) });
    this.api.get('/vouchers').subscribe({ next: (v) => this.catalog.set(v), error: (e) => this.err.set('Could not load vouchers: ' + errMsg(e)) });
  }

  // Redeem points for a voucher without leaving checkout, then apply it to this order
  redeem(v: any) {
    this.redeeming.set(true); this.err.set(''); this.redeemMsg.set('');
    this.api.post(`/vouchers/${v.id}/redeem`).subscribe({
      next: () => {
        this.api.get('/auth/me').subscribe((m) => this.points.set(m.points));
        this.api.get('/vouchers/mine').subscribe((list) => {
          const avail = list.filter((x: any) => x.status === 'available');
          this.vouchers.set(avail);
          const mine = avail.find((x: any) => x.code === v.code);
          if (mine) this.voucherId.set(mine.id);
          this.redeemMsg.set(`Voucher ${v.code} redeemed and applied to this order.`);
          this.redeeming.set(false);
        });
      },
      error: (e) => { this.err.set(errMsg(e)); this.redeeming.set(false); },
    });
  }

  imgOf(l: any): string { return l?.image_url ?? ''; }

  removeUnavailable() { this.unavailable().forEach((l) => this.cart.remove(l.id)); }

  place() {
    this.err.set('');
    if (!this.date || !this.time) { this.err.set('Choose a date and time for your meal'); return; }
    this.placing.set(true);
    const items = this.cart.lines().map((l) => ({ menu_item_id: l.id, quantity: l.qty }));
    this.api.post('/orders', { order_type: this.orderType(), scheduled_at: `${this.date}T${this.time}:00`, notes: this.notes, items, customer_voucher_id: this.voucherId() }).subscribe({
      next: (r) => { this.cart.clear(); this.router.navigate(['/customer/orders', r.id], { queryParams: { placed: 1 } }); },
      error: (e) => { this.err.set(errMsg(e)); this.placing.set(false); },
    });
  }
}