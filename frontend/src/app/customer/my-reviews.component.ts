import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, errMsg } from '../core/api.service';
import { img, ref, stars } from '../core/config';

const LABELS = ['', 'Not for me', 'Could be better', 'It was okay', 'Really enjoyed it', 'Loved it'];

@Component({
  selector: 'app-my-reviews',
  imports: [FormsModule, DatePipe, RouterLink],
  template: `
    <h1>Your honest take, warmly welcomed.</h1>
    <p class="sub">Share a little feedback on the meals you’ve enjoyed.</p>
    @if (err()) { <div class="alert err">{{ err() }}</div> }
    @if (msg()) { <div class="alert ok">{{ msg() }}</div> }

    <div class="twocol" style="margin-top:1.2rem">
      <div class="stack">
        <div class="panel">
          <h2>{{ editingId() ? 'Edit your review' : 'Write a review' }}</h2>
          @if (editingId()) {
            <p class="sub">{{ editingName() }}</p>
          } @else if (eligible().length) {
            @if (picked(); as p) {
              <div class="line">
                @if (p.image_url) { <img class="thumb" style="width:90px;height:76px" [src]="photo(p.image_url)" [alt]="p.name" /> } @else { <span class="thumb" style="width:90px;height:76px">–</span> }
                <div><b style="font-size:1.1rem">{{ p.name }}</b><small>{{ ref(p.order_id) }} · Completed {{ p.scheduled_at | date: 'd MMM y' }}</small><br /><span class="chip green">Verified order · Eligible to review</span></div>
              </div>
            }
            <label>Review an item from your completed orders</label>
            <select [ngModel]="sel()" (ngModelChange)="sel.set($event)">
              @for (e of eligible(); track key(e)) { <option [value]="key(e)">{{ e.name }} · {{ ref(e.order_id) }}</option> }
            </select>
          } @else {
            <div class="note">Nothing to review yet. Once an order is marked Completed, its items will appear here.</div>
          }

          @if (editingId() || eligible().length) {
            <label>Your rating · Select 1–5 stars</label>
            <div class="starpick">
              @for (n of [1, 2, 3, 4, 5]; track n) { <button type="button" (click)="rating.set(n)" [attr.aria-label]="n + ' stars'">{{ n <= rating() ? '★' : '☆' }}</button> }
            </div>
            <p class="hint">{{ rating() ? rating() + ' out of 5 · ' + labels[rating()] : 'Tap a star to rate' }}</p>
            <label>Your review</label>
            <textarea rows="4" [(ngModel)]="comment" placeholder="Tell us about the food."></textarea>
            <p class="hint">Tell us about the food. Your name and review will be visible publicly.</p>
            <p class="actions" style="margin-top:1rem">
              <button class="btn" [disabled]="busy()" (click)="publish()">{{ editingId() ? 'Save changes' : 'Publish review' }}</button>
              @if (editingId()) { <button class="btn ghost" (click)="cancelEdit()">Cancel</button> }
            </p>
          }
        </div>

        <div class="panel">
          <h2>Your published reviews</h2>
          @for (r of mine(); track r.id) {
            <div style="padding:.8rem 0;border-top:1px solid var(--line)">
              <div class="page-head" style="margin:0"><b>{{ r.item_name }} · <span class="rate">{{ stars(r.rating) }}</span></b><span class="st" [class]="r.is_hidden ? 'st' : 'st st-completed'">{{ r.is_hidden ? 'Hidden' : 'Visible' }}</span></div>
              <p class="hint" style="margin:.1rem 0 .4rem">{{ r.order_id ? ref(r.order_id) + ' · ' : '' }}{{ r.created_at | date: 'd MMM y' }} · Verified order</p>
              <p class="sub">{{ r.comment }}</p>
              <p class="actions" style="margin-top:.5rem"><button class="link" (click)="edit(r)">Edit review</button><button class="link plain" (click)="remove(r)">Delete review</button></p>
            </div>
          } @empty { <p class="hint">You haven’t published any reviews yet.</p> }
        </div>
      </div>

      <div class="stack">
        <div class="panel">
          <h2>Ready for your feedback</h2>
          <p class="sub" style="font-size:.86rem">More items from your completed orders:</p>
          @for (e of others(); track key(e)) { <p style="margin-top:.7rem"><b>{{ e.name }} · {{ ref(e.order_id) }}</b></p> } @empty { <p class="hint">No other items waiting.</p> }
          @if (others().length) { <p style="margin-top:.8rem"><button class="link" (click)="pickFirstOther()">Choose an item to review →</button></p> }
        </div>
        <div class="panel">
          <h2>Not eligible yet</h2>
          <p class="sub" style="font-size:.86rem">Only items from your own completed orders appear in the review selector.</p>
          <hr style="border:0;border-top:1px solid var(--line);margin:.8rem 0" />
          @for (o of notYet(); track o.id) {
            <p style="margin-bottom:.6rem"><b>{{ ref(o.id) }} · {{ o.status }}</b><br /><span class="hint">{{ o.status === 'Cancelled' || o.status === 'Rejected' ? o.status + ' orders cannot be reviewed.' : 'Reviews unlock after completion.' }}</span></p>
          } @empty { <p class="hint">All your orders are eligible.</p> }
          <p class="hint"><a routerLink="/customer/orders">See all my orders →</a></p>
        </div>
      </div>
    </div>
  `,
})
export class MyReviewsComponent implements OnInit {
  private api = inject(Api);
  ref = ref; photo = img; stars = stars; labels = LABELS;
  eligible = signal<any[]>([]);
  mine = signal<any[]>([]);
  orders = signal<any[]>([]);
  sel = signal('');
  rating = signal(0);
  comment = '';
  editingId = signal<number | null>(null);
  editingName = signal('');
  err = signal(''); msg = signal(''); busy = signal(false);

  key = (e: any) => `${e.order_id}:${e.menu_item_id}`;
  picked = computed(() => this.eligible().find((e) => this.key(e) === this.sel()));
  others = computed(() => this.eligible().filter((e) => this.key(e) !== this.sel()));
  notYet = computed(() => this.orders().filter((o) => o.status !== 'Completed'));

  ngOnInit() { this.load(); }
  load() {
    this.api.get('/reviews/eligible').subscribe((r) => { this.eligible.set(r); if (!r.some((e: any) => this.key(e) === this.sel())) this.sel.set(r[0] ? this.key(r[0]) : ''); });
    this.api.get('/reviews/mine').subscribe((r) => this.mine.set(r));
    this.api.get('/orders/mine').subscribe((r) => this.orders.set(r));
  }
  pickFirstOther() { const o = this.others()[0]; if (o) { this.sel.set(this.key(o)); window.scrollTo({ top: 0, behavior: 'smooth' }); } }

  publish() {
    this.err.set(''); this.msg.set('');
    if (!(this.rating() >= 1)) { this.err.set('Choose a star rating from 1 to 5'); return; }
    this.busy.set(true);
    const id = this.editingId();
    const p = this.picked();
    const req = id
      ? this.api.put(`/reviews/${id}`, { rating: this.rating(), comment: this.comment })
      : this.api.post('/reviews', { menu_item_id: p?.menu_item_id, order_id: p?.order_id, rating: this.rating(), comment: this.comment });
    req.subscribe({
      next: () => { this.msg.set(id ? 'Review updated.' : 'Thank you! Your review is published.'); this.reset(); this.load(); },
      error: (e) => { this.err.set(errMsg(e)); this.busy.set(false); },
    });
  }
  private reset() { this.busy.set(false); this.rating.set(0); this.comment = ''; this.editingId.set(null); }
  edit(r: any) { this.editingId.set(r.id); this.editingName.set(`${r.item_name}${r.order_id ? ' · ' + ref(r.order_id) : ''}`); this.rating.set(r.rating); this.comment = r.comment ?? ''; window.scrollTo({ top: 0, behavior: 'smooth' }); }
  cancelEdit() { this.reset(); }
  remove(r: any) {
    if (!confirm('Delete this review?')) return;
    this.api.delete(`/reviews/${r.id}`).subscribe({ next: () => { this.msg.set('Review deleted.'); this.load(); }, error: (e) => this.err.set(errMsg(e)) });
  }
}
