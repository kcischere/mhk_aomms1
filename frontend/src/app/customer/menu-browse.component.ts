import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, errMsg } from '../core/api.service';
import { CartService } from '../core/cart.service';
import { img, stars } from '../core/config';

@Component({
  selector: 'app-menu-browse',
  imports: [FormsModule, CurrencyPipe, DecimalPipe, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>What are you craving today?</h1>
        <p class="sub">Pick your dishes now and choose a pickup or dine-in time at checkout.</p>
      </div>
      <a class="btn" routerLink="/customer/cart">View cart · {{ cart.count() }}</a>
    </div>
    @if (err()) { <div class="alert err">{{ err() }}</div> }
    @if (msg()) { <div class="alert ok">{{ msg() }}</div> }

    <div class="filters">
      <input class="grow" type="search" placeholder="Search dishes…" [ngModel]="q()" (ngModelChange)="q.set($event)" />
      <select [ngModel]="avail()" (ngModelChange)="avail.set($event)">
        <option value="">All availability</option><option value="1">Available now</option>
      </select>
    </div>
    <div class="tabs" style="margin-top:0">
      <button class="tab" [class.on]="!cat()" (click)="cat.set('')">All</button>
      @for (c of categories(); track c) { <button class="tab" [class.on]="cat() === c" (click)="cat.set(c)">{{ c }}</button> }
    </div>

    <div class="cgrid">
      @for (m of filtered(); track m.id) {
        <div class="dish">
          <a [routerLink]="['/customer/menu', m.id]">
            @if (m.image_url) { <img class="pic" [src]="photo(m.image_url)" [alt]="m.name" /> } @else { <div class="pic">No photo yet</div> }
          </a>
          <div class="body">
            <span><span class="chip">{{ m.category }}</span> <span class="chip" [class.green]="m.available" [class.red]="!m.available">{{ m.available ? 'Available' : 'Unavailable' }}</span></span>
            <h3><a [routerLink]="['/customer/menu', m.id]">{{ m.name }}</a></h3>
            @if (m.review_count) { <span class="rate">{{ stars(m.avg_rating) }} {{ m.avg_rating | number: '1.1-1' }} · {{ m.review_count }} reviews</span> }
            <span class="price">{{ m.price | currency: 'PHP' }}</span>
            <button class="btn" [disabled]="!m.available" (click)="add(m)">{{ m.available ? 'Add to cart' : 'Unavailable' }}</button>
          </div>
        </div>
      } @empty {
        <div class="panel empty" style="grid-column:1/-1">No dishes match your search.</div>
      }
    </div>
  `,
})
export class MenuBrowseComponent implements OnInit {
  private api = inject(Api);
  cart = inject(CartService);
  photo = img;
  stars = stars;
  items = signal<any[]>([]);
  q = signal(''); cat = signal(''); avail = signal('');
  err = signal(''); msg = signal('');
  categories = computed(() => [...new Set(this.items().map((i) => i.category))]);
  filtered = computed(() => {
    const q = this.q().toLowerCase();
    return this.items().filter((m) =>
      (!q || `${m.name} ${m.description ?? ''}`.toLowerCase().includes(q)) &&
      (!this.cat() || m.category === this.cat()) && (!this.avail() || m.available));
  });

  ngOnInit() { this.api.get('/menu').subscribe({ next: (r) => this.items.set(r), error: (e) => this.err.set(errMsg(e)) }); }

  add(m: any) {
    this.cart.add(m);
    this.msg.set(`${m.name} was added to your cart.`);
    setTimeout(() => this.msg.set(''), 3000);
  }
}
