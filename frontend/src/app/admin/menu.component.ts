import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api, errMsg } from '../core/api.service';
import { img } from '../core/config';

@Component({
  selector: 'app-menu',
  imports: [FormsModule, CurrencyPipe, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>Your menu, kept fresh.</h1>
        <p class="sub">Manage prices and availability. Saved changes appear on the customer menu immediately.</p>
      </div>
      <a class="btn" routerLink="/admin/menu/new">+ Add menu item</a>
    </div>
    <div class="chips">
      <span class="chip">{{ items().length }} menu items</span>
      <span class="chip green">{{ availableCount() }} Available</span>
      <span class="chip red">{{ items().length - availableCount() }} Unavailable</span>
    </div>
    @if (err()) { <div class="alert err">{{ err() }}</div> }

    <div class="filters">
      <input class="grow" type="search" placeholder="Search menu name or description…" [(ngModel)]="q" (ngModelChange)="qs.set($event)" />
      <select [(ngModel)]="category" (ngModelChange)="cs.set($event)">
        <option value="">All categories</option>
        @for (c of categories(); track c) { <option [value]="c">{{ c }}</option> }
      </select>
      <select [(ngModel)]="avail" (ngModelChange)="avs.set($event)">
        <option value="">All availability</option><option value="1">Available</option><option value="0">Unavailable</option>
      </select>
    </div>

    <div class="panel flush">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Menu item</th><th>Category</th><th>Price</th><th>Availability</th><th>Action</th></tr></thead>
          <tbody>
            @for (m of filtered(); track m.id) {
              <tr>
                <td>
                  <div class="item-cell">
                    @if (m.image_url) { <img class="thumb" [src]="photo(m.image_url)" [alt]="m.name" /> } @else { <span class="thumb">No photo</span> }
                    {{ m.name }}
                  </div>
                </td>
                <td>{{ m.category }}</td>
                <td><b>{{ m.price | currency: 'PHP' }}</b></td>
                <td>
                  <span class="actions">
                    <button class="sw" [class.on]="m.available" (click)="toggle(m)" [attr.aria-label]="'Toggle availability for ' + m.name"></button>
                    <span [style.color]="m.available ? 'var(--green)' : 'var(--red)'" style="font-size:.8rem">{{ m.available ? 'Available' : 'Unavailable' }}</span>
                  </span>
                </td>
                <td class="actions">
                  <a class="link" [routerLink]="['/admin/menu', m.id]">Edit →</a>
                  <button class="link plain" (click)="remove(m)">Delete</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty">No menu items match. Try another search or add a new item.</td></tr>
            }
          </tbody>
        </table>
      </div>
      <div class="pager"><span>Showing {{ filtered().length }} of {{ items().length }} menu items</span><span style="margin-left:auto">Availability is on/off — not a quantity count.</span></div>
    </div>

    <div class="note"><b>A small change, visible right away</b>Switching an item to Unavailable disables ordering for customers. A checkout with that item must be resolved before it can be submitted.</div>
  `,
})
export class MenuComponent implements OnInit {
  private api = inject(Api);
  photo = img;
  items = signal<any[]>([]);
  categories = signal<string[]>([]);
  err = signal('');
  q = ''; category = ''; avail = '';
  qs = signal(''); cs = signal(''); avs = signal('');

  availableCount = computed(() => this.items().filter((m) => m.available).length);
  filtered = computed(() => {
    const q = this.qs().toLowerCase();
    return this.items().filter((m) =>
      (!q || `${m.name} ${m.description ?? ''}`.toLowerCase().includes(q)) &&
      (!this.cs() || m.category === this.cs()) &&
      (!this.avs() || String(m.available ? 1 : 0) === this.avs()));
  });

  ngOnInit() { this.load(); }
  load() {
    this.api.get('/menu').subscribe({ next: (r) => this.items.set(r), error: (e) => this.err.set(errMsg(e)) });
    this.api.get('/menu/categories').subscribe((r) => this.categories.set(r));
  }
  toggle(m: any) {
    this.api.patch(`/menu/${m.id}/availability`, { available: !m.available }).subscribe({ next: () => this.load(), error: (e) => this.err.set(errMsg(e)) });
  }
  remove(m: any) {
    if (!confirm(`Delete "${m.name}"? This cannot be undone.`)) return;
    this.api.delete(`/menu/${m.id}`).subscribe({ next: () => this.load(), error: (e) => this.err.set(errMsg(e)) });
  }
}
