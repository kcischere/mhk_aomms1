import { Component, OnInit, ViewEncapsulation, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { CartService } from '../core/cart.service';

// Mr. Hungry Kitchen logo (flame, fork and spatula), embedded so no extra file is needed
export const LOGO = 'data:image/png;base64,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';

const NAV = [
  { path: '/customer/menu', label: 'Browse menu', icon: 'M5 3v7a2 2 0 0 0 4 0V3 M7 3v18 M18 3c-2.2 1.6-3 4-3 7h3v11' },
  { path: '/customer/orders', label: 'My orders', icon: 'M9 3h6v3H9z M7 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1 M8 12h8 M8 16h8' },
  { path: '/customer/rewards', label: 'Rewards & vouchers', icon: 'M3 8h18v4H3z M12 8v13 M5 12v9h14v-9 M12 8c-2-4-6-4-6-1 0 2 3 1 6 1 M12 8c2-4 6-4 6-1 0 2-3 1-6 1' },
  { path: '/customer/reviews', label: 'My reviews', icon: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z' },
  { path: '/customer/account', label: 'My account', icon: 'M16 8a4 4 0 1 0-8 0 4 4 0 0 0 8 0 M4 21c0-4 4-6 8-6s8 2 8 6' },
];

@Component({
  selector: 'app-customer-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
  styleUrls: ['./staff.css', './customer.css'],
  styles: [`
/* =====================================================================
   Mr. Hungry Kitchen - admin + cashier theme
   Palette taken from the logo: flame orange, charcoal black, soft grey.
   Doubled .app-staff selectors make these win over staff.css.
   ===================================================================== */

/* ---------- Full width: every wrapper fills the screen ---------- */
body:has(app-shell) { display: block; }
app-root:has(> app-shell) { display: block; width: 100%; }
app-shell { display: block; width: 100%; min-width: 0; }

.app-staff.app-staff { width: 100%; overflow-x: clip; }
.app-staff.app-staff .shell { width: 100%; grid-template-columns: 250px minmax(0, 1fr); }
.app-staff.app-staff .content { width: 100%; min-width: 0; }
.app-staff.app-staff main {
  width: 100%;
  max-width: 1800px;
  margin: 0 auto;
  padding: 2rem clamp(1rem, 3vw, 2.5rem);
}
.app-staff.app-staff .topbar,
.app-staff.app-staff footer {
  padding-left: clamp(1rem, 3vw, 2.5rem);
  padding-right: clamp(1rem, 3vw, 2.5rem);
}
.app-staff.app-staff .table-wrap { overflow-x: auto; }
.app-staff.app-staff .table-wrap table { min-width: 640px; }

/* ---------- Brand palette ---------- */
.app-staff.app-staff {
  --brand: #f26a14;
  --brand-2: #ff8a2a;
  --charcoal: #161616;
  --charcoal-2: #262626;

  --bg: #ececec;
  --line: #dcdcdc;
  --ink: #161616;
  --muted: #6a6a6a;
  --accent: #e8610c;
  --accent-2: #cf520a;
  --accent-soft: #fde6d2;
  --sand: #f0eeea;

  --glass: rgba(255, 255, 255, .58);
  --glass-strong: rgba(255, 255, 255, .8);
  --glass-soft: rgba(255, 255, 255, .38);
  --glass-border: rgba(255, 255, 255, .78);
  --glass-shadow: 0 10px 34px rgba(40, 25, 10, .12);
  --blur: blur(18px) saturate(160%);

  background:
    radial-gradient(820px 540px at 100% 0%, rgba(242, 106, 20, .30), transparent 62%),
    radial-gradient(720px 520px at 0% 100%, rgba(22, 22, 22, .16), transparent 60%),
    radial-gradient(620px 420px at 72% 100%, rgba(255, 150, 60, .20), transparent 60%),
    linear-gradient(160deg, #f4f3f1 0%, #e6e5e3 100%);
  background-attachment: fixed;
}

/* ---------- Sidebar: charcoal glass with an orange edge ---------- */
.app-staff.app-staff .side {
  background: linear-gradient(180deg, rgba(26, 26, 26, .93), rgba(12, 12, 12, .95));
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  border-right: 3px solid var(--brand);
  box-shadow: 6px 0 34px rgba(0, 0, 0, .22);
  color: #e9e9e9;
}
.app-staff.app-staff .brand { gap: .85rem; padding-bottom: .5rem; }
.app-staff.app-staff .logo {
  width: 58px;
  height: 58px;
  padding: 6px;
  border-radius: 17px;
  background: linear-gradient(145deg, #fbfaf8, #e8e5e0);
  box-shadow: 0 8px 20px rgba(0, 0, 0, .4), inset 0 1px 0 #fff;
  display: grid;
  place-items: center;
  flex: none;
}
.app-staff.app-staff .logo img { width: 100%; height: 100%; object-fit: contain; display: block; }
.app-staff.app-staff .brand b {
  color: #fff;
  font-weight: 900;
  font-size: 1.05rem;
  letter-spacing: .05em;
  text-transform: uppercase;
  line-height: 1.1;
}
.app-staff.app-staff .brand small {
  color: var(--brand);
  font-size: .64rem;
  font-weight: 800;
  letter-spacing: .34em;
  margin-top: .2rem;
}
.app-staff.app-staff .tagline {
  font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive;
  font-size: .76rem;
  color: #b9b9b9;
  padding: 0 .4rem 1rem;
}
.app-staff.app-staff .side-label {
  display: flex;
  align-items: center;
  gap: .55rem;
  color: #9d9d9d;
  letter-spacing: .14em;
}
.app-staff.app-staff .side-label::after { content: ''; flex: 1; height: 2px; background: #333; border-radius: 2px; }

.app-staff.app-staff nav a {
  color: #d2d2d2;
  transition: background .18s ease, color .18s ease, transform .18s ease;
}
.app-staff.app-staff nav a:hover { background: rgba(255, 255, 255, .09); color: #fff; transform: translateX(2px); }
.app-staff.app-staff nav a.active {
  background: linear-gradient(90deg, var(--brand), var(--brand-2));
  color: #fff;
  font-weight: 800;
  box-shadow: 0 8px 20px rgba(242, 106, 20, .38);
}
.app-staff.app-staff .side-note {
  background: rgba(255, 255, 255, .06);
  border: 1px dashed rgba(255, 255, 255, .2);
  border-radius: 14px;
  color: #bdbdbd;
}
.app-staff.app-staff .side-note b { color: #fff; }
.app-staff.app-staff .me {
  background: rgba(255, 255, 255, .06);
  border: 1px solid rgba(255, 255, 255, .1);
  border-radius: 14px;
  margin-top: .8rem;
  padding: .7rem .75rem;
}
.app-staff.app-staff .me b { color: #fff; }
.app-staff.app-staff .me small { color: #a8a8a8; }
.app-staff.app-staff .avatar { background: linear-gradient(135deg, var(--brand), var(--brand-2)); color: #fff; }
.app-staff.app-staff .logout { color: #c9c9c9; }
.app-staff.app-staff .logout:hover { color: var(--brand-2); }

/* ---------- Top bar: logo-style double stripe ---------- */
.app-staff.app-staff .topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--glass);
  -webkit-backdrop-filter: var(--blur);
  backdrop-filter: var(--blur);
  border-top: 4px solid var(--brand);
  border-bottom: 2px solid var(--charcoal);
  color: #4a4a4a;
  font-weight: 600;
}
.app-staff.app-staff .pill { background: var(--charcoal); color: var(--brand-2); font-weight: 800; letter-spacing: .04em; }
.app-staff.app-staff footer { color: var(--muted); }

/* Page titles get the logo's orange + black underline */
.app-staff.app-staff h1 { font-weight: 900; letter-spacing: -.015em; color: var(--charcoal); }
.app-staff.app-staff h1::after {
  content: '';
  display: block;
  width: 78px;
  height: 5px;
  margin-top: .55rem;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--brand) 0 68%, var(--charcoal) 68% 100%);
}
.app-staff.app-staff .eyebrow { color: var(--brand); letter-spacing: .16em; font-weight: 800; }

/* ---------- Glass cards ---------- */
.app-staff.app-staff .panel,
.app-staff.app-staff .card,
.app-staff.app-staff .stat,
.app-staff.app-staff .review,
.app-staff.app-staff .note {
  background: var(--glass);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), inset 0 1px 0 rgba(255, 255, 255, .85);
  -webkit-backdrop-filter: var(--blur);
  backdrop-filter: var(--blur);
}
.app-staff.app-staff .stat {
  border-top: 4px solid var(--brand);
  transition: transform .18s ease, box-shadow .18s ease;
}
.app-staff.app-staff .stat:nth-child(even) { border-top-color: var(--charcoal); }
.app-staff.app-staff .stat:hover { transform: translateY(-3px); box-shadow: 0 18px 40px rgba(40, 25, 10, .18), inset 0 1px 0 rgba(255, 255, 255, .85); }
.app-staff.app-staff .stat b { color: var(--charcoal); }
.app-staff.app-staff .quick b { color: var(--accent); }
.app-staff.app-staff .bar i { background: linear-gradient(180deg, var(--brand-2), var(--brand)); }

/* ---------- Tables: charcoal header strip ---------- */
.app-staff.app-staff th {
  background: rgba(22, 22, 22, .9);
  color: #f3f3f3;
  letter-spacing: .08em;
}
.app-staff.app-staff th:first-child { border-top-left-radius: 10px; }
.app-staff.app-staff th:last-child { border-top-right-radius: 10px; }
.app-staff.app-staff td { border-bottom-color: rgba(22, 22, 22, .09); }
.app-staff.app-staff tr:hover td { background: rgba(242, 106, 20, .07); }

/* Order list rows */
.app-staff.app-staff .orow { background: var(--glass-soft); border-color: rgba(255, 255, 255, .55); }
.app-staff.app-staff .orow:hover { background: rgba(255, 255, 255, .7); }
.app-staff.app-staff .orow.sel { background: rgba(242, 106, 20, .13); border-color: rgba(242, 106, 20, .45); }

/* ---------- Inputs ---------- */
.app-staff.app-staff input,
.app-staff.app-staff select,
.app-staff.app-staff textarea {
  background: rgba(255, 255, 255, .66);
  border-color: rgba(255, 255, 255, .9);
  box-shadow: inset 0 1px 2px rgba(40, 25, 10, .07);
}
.app-staff.app-staff input:focus,
.app-staff.app-staff select:focus,
.app-staff.app-staff textarea:focus {
  background: #fff;
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(242, 106, 20, .22);
}

/* ---------- Buttons ---------- */
.app-staff.app-staff .btn:not(.ghost):not(.danger) {
  background: linear-gradient(135deg, var(--brand-2), #e8590a);
  border-color: rgba(255, 255, 255, .4);
  color: #fff;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(242, 106, 20, .32);
}
.app-staff.app-staff .btn:not(.ghost):not(.danger):hover {
  background: linear-gradient(135deg, #ff9a3e, #f26a14);
  transform: translateY(-1px);
}
.app-staff.app-staff .btn.ghost {
  background: var(--glass-strong);
  border-color: rgba(22, 22, 22, .22);
  color: var(--charcoal);
}
.app-staff.app-staff .btn.ghost:hover { background: var(--charcoal); border-color: var(--charcoal); color: #fff; }

/* ---------- Tabs and chips ---------- */
.app-staff.app-staff .tab { background: var(--glass); border-color: var(--glass-border); color: #444; }
.app-staff.app-staff .tab.on { background: var(--charcoal); border-color: var(--charcoal); color: var(--brand-2); }
.app-staff.app-staff .chip { background: rgba(255, 255, 255, .62); }

/* ---------- Popups ---------- */
.app-staff.app-staff .overlay {
  background: rgba(15, 15, 15, .45);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}
.app-staff.app-staff .modal {
  background: var(--glass-strong);
  border: 1px solid var(--glass-border);
  border-top: 5px solid var(--brand);
  box-shadow: 0 24px 70px rgba(10, 10, 10, .4);
  -webkit-backdrop-filter: var(--blur);
  backdrop-filter: var(--blur);
}

/* ---------- Cashier counter page (its own styles are scoped) ---------- */
.app-staff.app-staff .counter.counter { background: transparent; padding: 0; }
.app-staff.app-staff .counter .card.card {
  background: var(--glass);
  border: 1px solid var(--glass-border);
  border-left: 5px solid var(--brand);
  box-shadow: var(--glass-shadow), inset 0 1px 0 rgba(255, 255, 255, .85);
  -webkit-backdrop-filter: var(--blur);
  backdrop-filter: var(--blur);
}
.app-staff.app-staff .counter .pay.pay,
.app-staff.app-staff .counter .notes.notes { background: var(--glass-soft); }
.app-staff.app-staff .counter .tabs button { background: var(--glass); border-color: var(--glass-border); color: #444; }
.app-staff.app-staff .counter .tabs button.on { background: var(--charcoal); border-color: var(--charcoal); color: var(--brand-2); }
.app-staff.app-staff .counter .pill { background: var(--brand); color: #fff; }
.app-staff.app-staff .counter .tabs .on .pill { background: var(--brand); color: #fff; }

/* Browsers without backdrop-filter get more solid panels */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .app-staff.app-staff .topbar, .app-staff.app-staff .panel, .app-staff.app-staff .card,
  .app-staff.app-staff .stat, .app-staff.app-staff .review, .app-staff.app-staff .modal { background: rgba(255, 255, 255, .94); }
}

/* ---------- Phone menu button and backdrop ---------- */
.app-staff.app-staff .menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  margin-right: .6rem;
  border: 2px solid var(--charcoal);
  border-radius: 11px;
  background: var(--glass-strong);
  color: var(--charcoal);
  font-size: 1.1rem;
  cursor: pointer;
}
.app-staff.app-staff .scrim { display: none; }

/* ---------- Responsive ---------- */
@media (max-width: 1200px) {
  .app-staff.app-staff .shell { grid-template-columns: 220px minmax(0, 1fr); }
}

@media (max-width: 900px) {
  .app-staff.app-staff .shell { grid-template-columns: minmax(0, 1fr); }
  .app-staff.app-staff .side {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 270px;
    height: 100vh;
    z-index: 40;
    transform: translateX(-100%);
    transition: transform .22s ease;
  }
  .app-staff.app-staff .shell.open .side { transform: translateX(0); box-shadow: 10px 0 40px rgba(0, 0, 0, .35); }
  .app-staff.app-staff .shell.open .scrim {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 15, 15, .5);
    z-index: 30;
  }
  .app-staff.app-staff .menu-btn { display: inline-flex; }
  .app-staff.app-staff main { padding: 1.2rem 1rem; }
  .app-staff.app-staff .page-head { flex-direction: column; align-items: stretch; }
}

/* =====================================================================
   Customer pages - same brand look as the admin side
   ===================================================================== */
.app-staff.app-staff .pill.green { background: var(--charcoal); color: var(--brand-2); }
.app-staff.app-staff .back { color: #4a4a4a; font-weight: 600; }
.app-staff.app-staff .back:hover { color: var(--brand); }

/* Dish cards */
.app-staff.app-staff .dish {
  background: var(--glass);
  border: 1px solid var(--glass-border);
  border-radius: 18px;
  box-shadow: var(--glass-shadow), inset 0 1px 0 rgba(255, 255, 255, .85);
  -webkit-backdrop-filter: var(--blur);
  backdrop-filter: var(--blur);
  transition: transform .2s ease, box-shadow .2s ease;
}
.app-staff.app-staff .dish:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 44px rgba(40, 25, 10, .2), inset 0 1px 0 rgba(255, 255, 255, .85);
}
.app-staff.app-staff .dish .pic { background: linear-gradient(135deg, #f1efec, #e2e0dc); color: #8a8a8a; }
.app-staff.app-staff .dish h3 { font-weight: 800; color: var(--charcoal); }
.app-staff.app-staff .price { color: var(--brand); font-weight: 900; }
.app-staff.app-staff .rate { color: var(--brand); }

/* Quantity stepper */
.app-staff.app-staff .stepper { background: var(--glass-strong); border: 1.5px solid rgba(22, 22, 22, .2); }
.app-staff.app-staff .stepper button { color: var(--brand); font-weight: 800; }
.app-staff.app-staff .stepper button:disabled { color: #bdbdbd; }
.app-staff.app-staff .stepper span { color: var(--charcoal); }

/* Review cards, cart lines, order history */
.app-staff.app-staff .rcard {
  background: var(--glass);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow), inset 0 1px 0 rgba(255, 255, 255, .85);
  -webkit-backdrop-filter: var(--blur);
  backdrop-filter: var(--blur);
}
.app-staff.app-staff .cart-line,
.app-staff.app-staff .hist { border-bottom-color: rgba(22, 22, 22, .09); }
.app-staff.app-staff .item-hero img,
.app-staff.app-staff .item-hero .pic { border-radius: 18px; box-shadow: var(--glass-shadow); }

/* Order progress steps */
.app-staff.app-staff .step .num { background: rgba(22, 22, 22, .09); color: #555; }
.app-staff.app-staff .step.on .num { background: var(--brand); color: #fff; box-shadow: 0 6px 14px rgba(242, 106, 20, .4); }
.app-staff.app-staff .step.on b { color: var(--brand); }

/* Rewards: charcoal points card with an orange glow */
.app-staff.app-staff .dark {
  background:
    radial-gradient(420px 260px at 100% 0%, rgba(242, 106, 20, .45), transparent 65%),
    linear-gradient(150deg, #212121, #0d0d0d);
  border: 1px solid rgba(255, 255, 255, .08);
  border-left: 5px solid var(--brand);
  box-shadow: 0 18px 44px rgba(0, 0, 0, .35);
}
.app-staff.app-staff .dark .eyebrow { color: var(--brand-2); }
.app-staff.app-staff .dark .bigpts { color: #fff; text-shadow: 0 2px 22px rgba(242, 106, 20, .55); }
.app-staff.app-staff .progress { background: rgba(255, 255, 255, .14); }
.app-staff.app-staff .progress i { background: linear-gradient(90deg, var(--brand), var(--brand-2)); }
.app-staff.app-staff .vcard .val { color: var(--brand); }

/* Profile + star rating */
.app-staff.app-staff .avatar-lg { background: linear-gradient(135deg, var(--brand), var(--brand-2)); color: #fff; box-shadow: 0 8px 18px rgba(242, 106, 20, .35); }
.app-staff.app-staff .starpick button { color: var(--brand); }

  `],
  encapsulation: ViewEncapsulation.None,
  host: { style: 'position:fixed;inset:0;display:block;overflow:auto;background:#ececec' },
  template: `
    <div class="app-staff">
      <div class="shell" [class.open]="menuOpen">
        <div class="scrim" (click)="menuOpen = false"></div>
        <aside class="side">
          <div class="brand">
            <span class="logo"><img [src]="logo" alt="Mr. Hungry Kitchen" /></span>
            <div><b>mr. hungry</b><small>KITCHEN</small></div>
          </div>
          <div class="tagline">Satisfy Every Craving</div>
          <div class="side-label">YOUR KITCHEN, ONLINE</div>
          <nav>
            @for (l of nav; track l.path) {
              <a [routerLink]="l.path" routerLinkActive="active" (click)="menuOpen = false"><svg viewBox="0 0 24 24"><path [attr.d]="l.icon" /></svg>{{ l.label }}</a>
            }
          </nav>
          <div class="side-note"><b>Made here. Enjoyed here.</b><span>Pickup &amp; dine-in pre-orders</span><span>Daily · 10:00 AM – 8:00 PM</span></div>
          <div class="me">
            <span class="avatar">{{ initials() }}</span>
            <div><b>{{ auth.user()?.name }}</b><small>Customer</small></div>
          </div>
          <button class="logout" (click)="auth.logout()">↪ Log out</button>
        </aside>
        <div class="content">
          <header class="topbar">
            <span class="crumb"><button type="button" class="menu-btn" (click)="menuOpen = !menuOpen" aria-label="Open menu">☰</button>MR. HUNGRY KITCHEN / {{ section() }}</span>
            <span class="right">
              <a class="btn ghost sm" routerLink="/customer/cart">Cart · {{ cart.count() }}</a>
              <span class="pill green">Pickup &amp; dine-in</span>{{ today | date: 'EEE, d MMMM y' }}
            </span>
          </header>
          <main><router-outlet /></main>
          <footer><span>Mr. Hungry Kitchen · A little advance, a lot of sarap.</span><span>MHK-AOMMS</span></footer>
        </div>
      </div>
    </div>
  `,
})
export class CustomerShellComponent implements OnInit {
  auth = inject(AuthService);
  cart = inject(CartService);
  private router = inject(Router);
  logo = LOGO;
  nav = NAV;
  menuOpen = false;
  today = new Date();
  private url = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url)),
    { initialValue: this.router.url }
  );
  section = computed(() => {
    const u = this.url();
    if (u.startsWith('/customer/cart')) return 'Browse menu';
    return NAV.find((l) => u.startsWith(l.path))?.label ?? '';
  });
  initials = computed(() => (this.auth.user()?.name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join(''));
  ngOnInit() { this.cart.reload(); }
}