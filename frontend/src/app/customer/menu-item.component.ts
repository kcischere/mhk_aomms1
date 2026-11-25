import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api, errMsg } from '../core/api.service';
import { CartService } from '../core/cart.service';
import { img, shortName, stars } from '../core/config';

@Component({
  selector: 'app-menu-item',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink],
  template: `
    <a class="back" routerLink="/customer/menu">← Back to browse menu</a>
    @if (err()) { <div class="alert err">{{ err() }}</div> }
    @if (item(); as m) {
      <div class="item-hero">
        @if (m.image_url) { <img [src]="photo(m.image_url)" [alt]="m.name" /> } @else { <div class="pic">No photo yet</div> }
        <div>
          <span class="chip">{{ m.category }}</span> <span class="chip" [class.green]="m.available" [class.red]="!m.available">{{ m.available ? 'Available' : 'Unavailable' }}</span>
          <h1>{{ m.name }}</h1>
          @if (m.review_count) { <p class="rate">{{ stars(m.avg_rating) }} {{ m.avg_rating | number: '1.1-1' }} · {{ m.review_count }} verified reviews</p> }
          <p class="sub" style="margin:.6rem 0">{{ m.description }}</p>
          <div class="big" style="margin:.8rem 0">{{ m.price | currency: 'PHP' }}</div>
          <hr style="border:0;border-top:1px solid var(--line);margin:1rem 0" />
          <div class="actions">
            <span class="stepper">
              <button [disabled]="qty() <= 1" (click)="qty.set(qty() - 1)" aria-label="Fewer">−</button><span>{{ qty() }}</span><button (click)="qty.set(qty() + 1)" aria-label="More">+</button>
            </span>
            <button class="btn" style="flex:1" [disabled]="!m.available" (click)="add(m)">{{ m.available ? 'Add to cart · ' + (m.price * qty() | currency: 'PHP') : 'Currently unavailable' }}</button>
          </div>
          @if (added()) { <div class="alert ok">Added to your cart. <a routerLink="/customer/cart">View cart and check out →</a></div> }
          <p class="hint">Made for scheduled pickup or dine-in. You’ll choose your time at checkout.</p>
        </div>
      </div>

      <div class="page-head" style="margin-bottom:0"><h2 style="font-size:1.4rem">What our loyal customers are saying</h2><span class="sub" style="font-size:.85rem">Recent · Verified completed orders</span></div>
      <div class="reviews3">
        @for (r of reviews().slice(0, 6); track r.id) {
          <div class="rcard">
            <div class="head"><b>{{ shortName(r.customer_name) }}</b><span class="hint" style="margin:0">{{ r.created_at | date: 'd MMM y' }}</span></div>
            <div class="rate" style="margin:.5rem 0">{{ stars(r.rating) }} · Verified</div>
            <p class="sub">{{ r.comment }}</p>
          </div>
        } @empty { <div class="panel empty" style="grid-column:1/-1">No reviews yet. Be the first after you enjoy this dish.</div> }
      </div>
      <p class="hint" style="margin-top:1rem">Only customers who completed an order with this item can leave a review.</p>
    }
  `,
})
export class MenuItemComponent implements OnInit {
  private api = inject(Api);
  private route = inject(ActivatedRoute);
  private cart = inject(CartService);
  photo = img; stars = stars; shortName = shortName;
  item = signal<any>(null);
  reviews = signal<any[]>([]);
  qty = signal(1);
  added = signal(false);
  err = signal('');

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.get(`/menu/${id}`).subscribe({ next: (r) => this.item.set(r), error: (e) => this.err.set(errMsg(e)) });
    this.api.get('/reviews', { menu_item_id: id }).subscribe((r) => this.reviews.set(r));
  }
  add(m: any) { this.cart.add(m, this.qty()); this.added.set(true); }
}
