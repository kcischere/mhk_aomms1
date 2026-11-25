import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api, errMsg } from '../core/api.service';
import { img, ref } from '../core/config';

@Component({
  selector: 'app-reviews',
  imports: [FormsModule, DatePipe],
  template: `
    <h1>Keep the conversation helpful.</h1>
    <p class="sub">Review verified customer feedback and manage what appears on the public menu.</p>
    <div class="chips">
      <span class="chip">{{ reviews().length }} reviews shown</span>
      <span class="chip green">{{ visibleCount() }} Visible</span>
      <span class="chip">{{ reviews().length - visibleCount() }} Hidden</span>
    </div>
    @if (err()) { <div class="alert err">{{ err() }}</div> }

    <div class="filters">
      <input class="grow" type="search" placeholder="Search review words, item or customer…" [(ngModel)]="q" (ngModelChange)="load()" />
      <select [(ngModel)]="hidden" (ngModelChange)="load()"><option value="">All visibility</option><option value="0">Visible</option><option value="1">Hidden</option></select>
      <select [(ngModel)]="rating" (ngModelChange)="load()"><option value="">All ratings</option>@for (n of [5, 4, 3, 2, 1]; track n) { <option [value]="n">{{ n }} stars</option> }</select>
    </div>
    <div class="tabs" style="margin-top:0">
      @for (s of sorts; track s.key) { <button class="tab" [class.on]="sort === s.key" (click)="sort = s.key; load()">{{ s.label }}</button> }
    </div>

    @for (r of reviews(); track r.id) {
      <div class="review">
        @if (r.image_url) { <img class="thumb" [src]="photo(r.image_url)" [alt]="r.item_name" /> } @else { <span class="thumb">No photo</span> }
        <div class="body">
          <div class="head">
            <div>
              <b>{{ r.customer_name }} - {{ r.item_name }}</b>
              <div class="hint" style="margin:0">{{ r.order_id ? ref(r.order_id) : 'Review #' + r.id }} · {{ r.created_at | date: 'd MMM y' }} · Verified completed order</div>
              <div class="stars">{{ stars(r.rating) }}</div>
            </div>
            <span class="st" [class]="'st ' + (r.is_hidden ? '' : 'st-completed')">{{ r.is_hidden ? 'Hidden from public menu' : 'Visible' }}</span>
          </div>
          <p class="sub">{{ r.comment }}</p>
          <div class="foot">
            @if (r.is_hidden) {
              <span style="color:var(--muted)">Hidden by {{ r.hidden_by_name || 'staff' }} · {{ r.hidden_at | date: 'd MMM y' }}{{ r.hidden_reason ? ' · ' + r.hidden_reason : '' }}</span>
            } @else {
              <span>Public on the item page · Verified purchase</span>
            }
            <span class="acts">
              <button class="link" (click)="toggle(r)">{{ r.is_hidden ? 'Show review' : 'Hide review' }}</button>
              <button class="link plain" (click)="remove(r)">Remove review</button>
            </span>
          </div>
        </div>
      </div>
    } @empty {
      <div class="panel empty">No reviews match. Customers can review items from their completed orders.</div>
    }

    <div class="note"><b>Hide or remove — choose with care</b>Hidden reviews remain here for staff but are not visible to customers. Removing a review deletes it from the review list. Reviews can only come from a customer’s own completed orders.</div>
  `,
})
export class ReviewsComponent implements OnInit {
  private api = inject(Api);
  photo = img;
  ref = ref;
  reviews = signal<any[]>([]);
  visibleCount = computed(() => this.reviews().filter((r) => !r.is_hidden).length);
  err = signal('');
  q = ''; hidden = ''; rating = ''; sort = 'newest';
  sorts = [{ key: 'newest', label: 'Newest date' }, { key: 'oldest', label: 'Oldest date' }, { key: 'highest', label: 'Highest rating' }, { key: 'lowest', label: 'Lowest rating' }];

  ngOnInit() { this.load(); }
  load() {
    this.api.get('/reviews/admin', { q: this.q, hidden: this.hidden, rating: this.rating, sort: this.sort }).subscribe({
      next: (r) => this.reviews.set(r), error: (e) => this.err.set(errMsg(e)),
    });
  }
  stars(n: number) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

  toggle(r: any) {
    let reason: string | undefined;
    if (!r.is_hidden) {
      reason = (prompt('Why are you hiding this review? (optional, shown to staff only)') ?? undefined) as string | undefined;
      if (reason === undefined) return;
    }
    this.api.patch(`/reviews/${r.id}/visibility`, { is_hidden: !r.is_hidden, reason }).subscribe({
      next: () => this.load(), error: (e) => this.err.set(errMsg(e)),
    });
  }
  remove(r: any) {
    if (!confirm('Remove this review permanently?')) return;
    this.api.delete(`/reviews/${r.id}`).subscribe({ next: () => this.load(), error: (e) => this.err.set(errMsg(e)) });
  }
}
