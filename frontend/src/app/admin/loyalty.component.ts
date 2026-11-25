import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, errMsg } from '../core/api.service';

@Component({
  selector: 'app-loyalty',
  imports: [FormsModule, CurrencyPipe, RouterLink],
  template: `
    <h1>Make coming back feel rewarding.</h1>
    <p class="sub">Simple rules for hungry points and vouchers, set by your kitchen.</p>
    <div class="note"><b>Changes apply to future orders only</b>Existing orders keep their recorded earning rules. Previously earned points and already issued voucher values are preserved.</div>
    @if (err()) { <div class="alert err">{{ err() }}</div> }
    @if (msg()) { <div class="alert ok">{{ msg() }}</div> }

    <div class="editor">
      <div class="stack">
        <div class="panel">
          <h2>Points earning rate</h2>
          <p class="sub" style="font-size:.88rem">Award points on the final order total after voucher discounts, only when the order is marked Completed.</p>
          <div class="row">
            <div><label>Points earned</label><input type="number" min="1" [ngModel]="earn()" (ngModelChange)="earn.set(+$event)" /></div>
            <div><label>Per spending amount (₱)</label><input type="number" min="1" step="0.01" [ngModel]="per()" (ngModelChange)="per.set(+$event)" /></div>
          </div>
          <p class="hint">Whole spending blocks only: ₱560 ÷ ₱{{ per() }} = {{ blocks(560) }} full blocks = {{ blocks(560) * earn() }} points.</p>
        </div>

        <div class="panel">
          <h2>Voucher redemption</h2>
          <p class="sub" style="font-size:.88rem">Each voucher has its own points cost, discount value and expiry date, so you can offer more than one.</p>
          <div class="note ok" style="margin-bottom:0"><b>One redemption, one deduction</b>Redeeming deducts the voucher’s points and gives the customer that voucher. Applying it at checkout uses it without deducting points again.</div>
          <p style="margin-top:.9rem"><a class="btn ghost" routerLink="/admin/vouchers">Add, edit or delete vouchers →</a></p>
        </div>

        <div class="actions"><button class="btn" [disabled]="saving()" (click)="save()">Save changes</button></div>
      </div>

      <div class="stack">
        <div class="panel live">
          <h2>Live example</h2>
          <p class="hint" style="margin-top:0">Using the values in this form</p>
          <div class="kv"><span>Order subtotal</span><span>{{ 685 | currency: 'PHP' }}</span></div>
          <div class="kv"><span>Voucher applied</span><span>−{{ 50 | currency: 'PHP' }}</span></div>
          <hr style="border:0;border-top:1px solid var(--line)" />
          <div class="kv"><b>Final order total</b><b>{{ 635 | currency: 'PHP' }}</b></div>
          <div class="pts">+{{ examplePoints() }} points</div>
          <p class="hint">Awarded after Completed, never at order placement. Pending, Preparing and Ready orders earn nothing yet.</p>
        </div>
        <div class="note"><b>Cancelled orders earn no points</b>Order status controls awarding. A cancelled order never contributes to a customer’s earned points.</div>
      </div>
    </div>
  `,
})
export class LoyaltyComponent implements OnInit {
  private api = inject(Api);
  earn = signal(1);
  per = signal(50);
  err = signal('');
  msg = signal('');
  saving = signal(false);
  blocks = (amount: number) => Math.floor(amount / Math.max(this.per(), 1));
  examplePoints = computed(() => this.blocks(635) * this.earn());

  ngOnInit() {
    this.api.get('/loyalty').subscribe({
      next: (r) => { this.earn.set(r.points_earned); this.per.set(Number(r.per_amount)); },
      error: (e) => this.err.set(errMsg(e)),
    });
  }

  save() {
    this.err.set(''); this.msg.set(''); this.saving.set(true);
    this.api.put('/loyalty', { points_earned: this.earn(), per_amount: this.per() }).subscribe({
      next: () => { this.msg.set('Loyalty settings saved. They apply to future orders.'); this.saving.set(false); },
      error: (e) => { this.err.set(errMsg(e)); this.saving.set(false); },
    });
  }
}
