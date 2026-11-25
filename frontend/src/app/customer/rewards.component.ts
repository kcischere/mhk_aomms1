import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Api, errMsg } from '../core/api.service';
import { ref } from '../core/config';

@Component({
  selector: 'app-rewards',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <p class="eyebrow">Customer / Rewards</p>
    <h1>Good food comes back around.</h1>
    <p class="sub">Your points, your perks. A little thank-you for coming back to the kitchen.</p>
    @if (err()) { <div class="alert err">{{ err() }}</div> }
    @if (msg()) { <div class="alert ok">{{ msg() }}</div> }

    @if (data(); as d) {
      <div class="twocol" style="margin-top:1.2rem">
        <div class="dark">
          <div class="eyebrow">{{ firstName(d.name) }}’s hungry points</div>
          <div class="bigpts">{{ d.balance }}</div>
          @if (next(); as v) {
            <div>{{ v.points_cost }} points unlock a {{ v.value | currency: 'PHP' : 'symbol' : '1.0-0' }} voucher</div>
            <div class="progress"><i [style.width.%]="Math.min(100, d.balance / Math.max(v.points_cost, 1) * 100)"></i></div>
            <small>{{ d.balance >= v.points_cost ? 'You’re ready for your next reward.' : 'Only ' + (v.points_cost - d.balance) + ' more points to go.' }}</small>
            <button class="btn block" style="margin-top:1rem" [disabled]="d.balance < v.points_cost || busy()" (click)="redeem(v)">Redeem {{ v.points_cost }} points for {{ v.value | currency: 'PHP' : 'symbol' : '1.0-0' }}</button>
            <p style="margin-top:.8rem"><small>After redeeming: {{ d.balance - v.points_cost }} points. A new voucher is added to your account.</small></p>
          } @else {
            <small>No vouchers are open for redemption right now. Check back soon.</small>
          }
        </div>
        <div class="panel">
          <h2>How your rewards work</h2>
          <ul class="how">
            <li><b>01</b><div><b>Enjoy your meal</b><p>Earn {{ d.rule.points_earned }} {{ d.rule.points_earned === 1 ? 'point' : 'points' }} per full {{ d.rule.per_amount | currency: 'PHP' : 'symbol' : '1.0-0' }} of your discounted total. Points are added only when your order is Completed.</p></div></li>
            <li><b>02</b><div><b>Redeem once you reach the points</b><p>Redeeming deducts the voucher’s points once and gives you that voucher. This is the only points-deduction event.</p></div></li>
            <li><b>03</b><div><b>Use a voucher at checkout</b><p>Apply one available voucher to reduce your total. It becomes Used when you place the order; no points are deducted again.</p></div></li>
          </ul>
        </div>
      </div>

      @if (redeemable().length) {
        <div class="panel" style="margin-top:1.1rem">
          <h2>Vouchers you can redeem</h2>
          <div class="vcards" style="margin-top:.6rem">
            @for (v of redeemable(); track v.id) {
              <div class="vcard card" style="padding:1rem">
                <div class="val">{{ v.value | currency: 'PHP' : 'symbol' : '1.0-0' }} off</div>
                <p><b>{{ v.code }}</b> · {{ v.points_cost }} points</p>
                <p class="hint">{{ v.description }}{{ v.expires_at ? ' · Expires ' + v.expires_at : '' }}</p>
                <button class="btn sm" style="margin-top:.6rem" [disabled]="d.balance < v.points_cost || busy()" (click)="redeem(v)">{{ d.balance < v.points_cost ? 'Not enough points' : 'Redeem' }}</button>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="panel" style="margin-top:1.1rem">
          <h2>Vouchers you can redeem</h2>
          <p class="hint">No vouchers are open for redemption right now. Check back soon.</p>
        </div>
      }

      <div class="vcards" style="margin-top:1.1rem">
        @for (g of groups(); track g.key) {
          <div class="panel vcard">
            <h2>{{ g.label }} · {{ g.items.length }}</h2>
            @for (v of g.items; track v.id) {
              <div style="padding:.5rem 0;border-top:1px solid var(--line)">
                <div class="row2"><span class="val">{{ v.value | currency: 'PHP' : 'symbol' : '1.0-0' }} {{ g.key === 'used' ? 'applied' : g.key === 'expired' ? 'voucher' : 'off' }}</span><span class="st" [class]="g.key === 'available' ? 'st st-completed' : g.key === 'expired' ? 'st st-cancelled' : 'st'">{{ g.key === 'available' ? 'Available' : g.key === 'used' ? 'Used' : 'Expired' }}</span></div>
                <b>{{ v.code }}</b>
                <p class="hint">
                  @if (g.key === 'available') { Redeemed {{ v.redeemed_at | date: 'd MMM' }}{{ v.expires_at ? ' · Expires ' + (v.expires_at | date: 'd MMM y') : '' }} }
                  @else if (g.key === 'used') { {{ v.order_id ? 'Order ' + ref(v.order_id) + ' · ' : '' }}{{ v.redeemed_at | date: 'd MMM y' }} }
                  @else { Expired {{ v.expires_at | date: 'd MMM y' }} · No longer usable }
                </p>
              </div>
            } @empty { <p class="hint">None yet.</p> }
          </div>
        }
      </div>

      <div class="panel" style="margin-top:1.1rem">
        <h2>Completed orders &amp; voucher usage</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Order</th><th>Items</th><th>Voucher used</th><th>Total paid</th><th>Points earned</th></tr></thead>
            <tbody>
              @for (o of history(); track o.id) {
                <tr>
                  <td><b>{{ o.scheduled_at | date: 'd MMM y' }}</b></td>
                  <td><a class="link" [routerLink]="['/customer/orders', o.id]">{{ ref(o.id) }}</a></td>
                  <td>{{ itemsText(o) }}</td>
                  <td>
                    @if (o.voucher_code && Number(o.discount) > 0) {
                      <b>{{ o.voucher_code }}</b> · −{{ o.discount | currency: 'PHP' }}
                    } @else { — }
                  </td>
                  <td>{{ o.total | currency: 'PHP' }}</td>
                  <td>+{{ earned(o) }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty">{{ historyLoaded() ? 'No completed orders yet. Complete an order to start earning.' : 'Loading…' }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        <p class="hint" style="margin-top:.8rem">{{ pendingText() }} Cancelled orders earn no points. Used and expired vouchers cannot be applied.</p>
      </div>
    }
  `,
})
export class RewardsComponent implements OnInit {
  private api = inject(Api);
  Math = Math; Number = Number; ref = ref;
  data = signal<any>(null);
  catalog = signal<any[]>([]);
  mine = signal<any[]>([]);
  orders = signal<any[]>([]);
  historyLoaded = signal(false);
  err = signal(''); msg = signal(''); busy = signal(false);

  redeemable = computed(() => [...this.catalog()].sort((a, b) => a.points_cost - b.points_cost));
  next = computed(() => this.redeemable()[0] ?? null);
  groups = computed(() => [
    { key: 'available', label: 'Available', items: this.mine().filter((v) => v.status === 'available') },
    { key: 'used', label: 'Used', items: this.mine().filter((v) => v.status === 'used') },
    { key: 'expired', label: 'Expired', items: this.mine().filter((v) => v.status === 'expired') },
  ]);
  history = computed(() =>
    this.orders()
      .filter((o) => o.status === 'Completed')
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
  );
  pendingText = computed(() => {
    const rule = this.data()?.rule;
    const pending = this.orders().filter((o) => ['Pending', 'Confirmed', 'Preparing', 'Ready'].includes(o.status));
    if (!pending.length || !rule) return 'No points are pending right now.';
    return pending.map((o) => `${o.points_estimate ?? this.calcPoints(o.total, rule)} on ${ref(o.id)}`).join(' and ') + ' are pending, not in your balance.';
  });

  ngOnInit() { this.load(); }
  firstName(n: string) { return (n ?? '').split(' ')[0]; }

  load() {
    this.api.get('/customer/points').subscribe({
      next: (r) => this.data.set(r),
      error: () => this.loadFallback(),
    });
    this.api.get('/vouchers').subscribe({ next: (r) => this.catalog.set(r), error: (e) => this.err.set('Could not load vouchers: ' + errMsg(e)) });
    this.api.get('/vouchers/mine').subscribe({ next: (r) => this.mine.set(r), error: (e) => this.err.set('Could not load your vouchers: ' + errMsg(e)) });
    this.api.get('/orders/mine').subscribe({
      next: (r: any) => { this.orders.set(Array.isArray(r) ? r : r.rows || []); this.historyLoaded.set(true); },
      error: (e) => { this.historyLoaded.set(true); this.err.set('Could not load your orders: ' + errMsg(e)); },
    });
  }

  private loadFallback() {
    forkJoin({ me: this.api.get('/auth/me'), rule: this.api.get('/loyalty') }).subscribe({
      next: ({ me, rule }) =>
        this.data.set({ name: me.name ?? '', balance: Number(me.points ?? 0), rule, history: [], pending: [] }),
      error: (e) => this.err.set(errMsg(e)),
    });
  }

  private calcPoints(total: any, rule: any) {
    return Math.floor(Number(total) / Number(rule.per_amount || 1)) * Number(rule.points_earned || 0);
  }
  earned(o: any) {
    if (o.points_earned != null) return Number(o.points_earned);
    return this.calcPoints(o.total, this.data()?.rule ?? { per_amount: 50, points_earned: 1 });
  }
  itemsText(o: any) {
    const items = o.items || [];
    if (!items.length) return '—';
    return items.map((i: any) => `${i.quantity} × ${i.name}`).join(', ');
  }

  redeem(v: any) {
    this.busy.set(true); this.err.set(''); this.msg.set('');
    this.api.post(`/vouchers/${v.id}/redeem`).subscribe({
      next: () => { this.msg.set(`Redeemed! Voucher ${v.code} is now in your account. Apply it when you check out.`); this.busy.set(false); this.load(); },
      error: (e) => { this.err.set(errMsg(e)); this.busy.set(false); },
    });
  }
}