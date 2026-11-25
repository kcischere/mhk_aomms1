import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * One line in the cart. `id` is the menu item id (sent to the API as menu_item_id).
 * The index signature keeps templates happy if a page reads an extra field.
 */
export interface CartLine {
  id: number;
  name: string;
  price: number;
  image: string | null;
  qty: number;
  available: boolean;
  [extra: string]: any;
}

const STORE = 'mhk_carts';
const MAX_QTY = 20;

/** Is this menu row (from the API) orderable? Handles `available` / `is_available`, boolean or 0/1. */
const isAvailable = (m: any): boolean => {
  const v = m?.available ?? m?.is_available ?? true;
  return !(v === false || v === 0 || v === '0');
};
const pickImage = (m: any): string | null =>
  m?.image ?? m?.image_url ?? m?.photo ?? m?.photo_url ?? m?.img ?? null;

/**
 * Customer cart. Lives in the browser (localStorage), one cart per logged-in user,
 * so it survives refreshes and doesn't leak between accounts on the same computer.
 * The backend only sees the cart when the customer places the order.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private auth = inject(AuthService);

  private store = signal<Record<string, CartLine[]>>(this.read());
  private key = computed(() => String(this.auth.user()?.id ?? 'guest'));

  /** Lines of the current user's cart. */
  readonly lines = computed<CartLine[]>(() => this.store()[this.key()] ?? []);
  /** Total number of items (sum of quantities). */
  readonly count = computed(() => this.lines().reduce((n, l) => n + l.qty, 0));
  readonly subtotal = computed(() => this.lines().reduce((s, l) => s + l.price * l.qty, 0));

  /** Add a menu item (pass the menu row from the API, or just its id). Returns false if it can't be added. */
  add(item: any, qty = 1): boolean {
    const isObj = item !== null && typeof item === 'object';
    const id = Number(isObj ? item.id : item);
    if (!id || qty < 1) return false;
    if (isObj && !isAvailable(item)) return false;

    this.update((ls) => {
      const found = ls.find((l) => l.id === id);
      if (found) {
        return ls.map((l) => (l.id === id ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l));
      }
      const line: CartLine = {
        id,
        name: isObj ? String(item.name ?? '') : '',
        price: isObj ? Number(item.price) || 0 : 0,
        image: isObj ? pickImage(item) : null,
        qty: Math.min(MAX_QTY, qty),
        available: true,
      };
      return [...ls, line];
    });
    return true;
  }

  setQty(id: number, qty: number) {
    if (qty < 1) return this.remove(id);
    this.update((ls) => ls.map((l) => (l.id === id ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)));
  }

  remove(id: number) {
    this.update((ls) => ls.filter((l) => l.id !== id));
  }

  clear() {
    this.update(() => []);
  }

  qtyOf(id: number): number {
    return this.lines().find((l) => l.id === id)?.qty ?? 0;
  }

  /**
   * Refresh names, prices, photos and availability from the latest menu
   * (so a price change or a sold-out item shows up in the cart right away).
   * Items that no longer exist in the menu are kept so the page can flag them.
   */
  sync(menu: any[]) {
    if (!Array.isArray(menu)) return;
    this.update((ls) =>
      ls.map((l) => {
        const m = menu.find((x) => Number(x.id) === l.id);
        return m
          ? { ...l, name: m.name ?? l.name, price: Number(m.price) || 0, image: pickImage(m) ?? l.image, available: isAvailable(m) }
          : l;
      }),
    );
  }

  /** Re-read the saved cart (e.g. after logging in). */
  reload() {
    this.store.set(this.read());
  }

  private update(fn: (ls: CartLine[]) => CartLine[]) {
    const k = this.key();
    const next = { ...this.store(), [k]: fn(this.store()[k] ?? []) };
    this.store.set(next);
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
    } catch {
      /* storage unavailable — the cart still works for this session */
    }
  }

  private read(): Record<string, CartLine[]> {
    try {
      return JSON.parse(localStorage.getItem(STORE) || '{}');
    } catch {
      return {};
    }
  }
}