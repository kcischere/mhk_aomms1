import { ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api, errMsg } from '../core/api.service';
import { img } from '../core/config';

@Component({
  selector: 'app-menu-edit',
  imports: [FormsModule, CurrencyPipe, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>Make it sound as good as it tastes.</h1>
        <p class="sub">Menu item editor · {{ id ? 'Editing ' + f.name : 'Adding a new dish' }}</p>
      </div>
      <a class="btn ghost" routerLink="/admin/menu">Back to menu</a>
    </div>
    <div class="tabs">
      <a class="tab" [class.on]="!!id" routerLink="/admin/menu" style="text-decoration:none">Edit existing item</a>
      <a class="tab" [class.on]="!id" routerLink="/admin/menu/new" style="text-decoration:none">+ Add new item</a>
    </div>
    @if (err()) { <div class="alert err">{{ err() }}</div> }

    <div class="editor">
      <div class="stack">
        <div class="panel">
          <h2>Item details</h2>
          <label>Item name</label>
          <input [(ngModel)]="f.name" />
          <label>Description</label>
          <textarea rows="3" [(ngModel)]="f.description"></textarea>
          <div class="row">
            <div>
              <label>Category</label>
              <input [(ngModel)]="f.category" list="cats" placeholder="e.g. Rice meals" />
              <datalist id="cats">@for (c of categories(); track c) { <option [value]="c"></option> }</datalist>
            </div>
            <div>
              <label>Price (Philippine peso)</label>
              <input type="number" min="0" step="0.01" [(ngModel)]="f.price" />
              <p class="hint">Enter the price per serving.</p>
            </div>
          </div>
        </div>

        <div class="panel">
          <h2>Photo (optional)</h2>
          <div class="photo-row">
            @if (f.image_url) { <img class="thumb" [src]="photo(f.image_url)" alt="Dish photo" /> } @else { <span class="thumb">No photo</span> }
            <div>
              <b>{{ f.image_url ? fileName() : 'No photo yet' }}</b>
              <p class="hint">Choose a clear, appetizing photo. JPG or PNG, up to 5 MB.</p>
              <input #file type="file" accept="image/png,image/jpeg" hidden (change)="upload($event)" />
              <p class="actions" style="margin-top:.6rem">
                <button class="btn ghost" (click)="file.click()">{{ uploading() ? 'Uploading…' : 'Upload / replace' }}</button>
                @if (f.image_url) { <button class="link plain" (click)="removePhoto()">Remove photo</button> }
              </p>
            </div>
          </div>
        </div>

        <div class="panel">
          <h2>Availability</h2>
          <div class="switch-row">
            <div><b>Available to order</b><p class="hint">On = Available · Off = Unavailable. This does not track stock quantities.</p></div>
            <button class="sw" [class.on]="f.available" (click)="f.available = !f.available" aria-label="Available to order"></button>
          </div>
        </div>

        <div class="actions">
          <button class="btn" [disabled]="saving()" (click)="save()">{{ saving() ? 'Saving…' : id ? 'Save changes' : 'Add item' }}</button>
          <a class="btn ghost" routerLink="/admin/menu">Cancel</a>
        </div>
      </div>

      <div class="stack">
        <div class="panel preview">
          <h2>Customer menu preview</h2>
          @if (f.image_url) { <img [src]="photo(f.image_url)" alt="" /> } @else { <div class="ph">No photo</div> }
          <div class="meta"><span class="chip">{{ f.category || 'Category' }}</span><span class="chip" [class.green]="f.available" [class.red]="!f.available">{{ f.available ? 'Available' : 'Unavailable' }}</span></div>
          <div class="big" style="font-size:1.4rem">{{ f.name || 'Item name' }}</div>
          <div class="big">{{ f.price || 0 | currency: 'PHP' }}</div>
        </div>
        <div class="note ok"><b>Saved means live</b>Your saved name, price, photo and availability appear immediately to customers.</div>
        <div class="panel">
          <h2>Adding a new dish?</h2>
          <p class="sub" style="font-size:.86rem">Choose “+ Add new item” above to open this same form with empty fields. Name, description, category and price are required; photo is optional.</p>
        </div>
      </div>
    </div>
  `,
})
export class MenuEditComponent implements OnInit {
  private api = inject(Api);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  photo = img;
  id: number | null = null;
  f: any = { name: '', description: '', category: '', price: null, image_url: '', available: true };
  categories = signal<string[]>([]);
  err = signal('');
  saving = signal(false);
  uploading = signal(false);

  ngOnInit() {
    const p = this.route.snapshot.paramMap.get('id');
    this.id = p && p !== 'new' ? Number(p) : null;
    this.api.get('/menu/categories').subscribe((r) => this.categories.set(r));
    if (this.id) {
      this.api.get(`/menu/${this.id}`).subscribe({
        next: (m) => { this.f = { ...m, available: !!m.available }; this.cdr.markForCheck(); },
        error: (e) => this.err.set(errMsg(e)),
      });
    }
  }

  fileName() { return String(this.f.image_url).split('/').pop(); }
  removePhoto() { this.f.image_url = ''; }

  upload(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { this.err.set('Photo must be 5 MB or smaller'); return; }
    const fd = new FormData();
    fd.append('photo', file);
    this.err.set('');
    this.uploading.set(true);
    this.api.post<{ url: string }>('/menu/upload', fd).subscribe({
      next: (r) => { this.f.image_url = r.url; this.uploading.set(false); this.cdr.markForCheck(); },
      error: (e) => { this.err.set(errMsg(e)); this.uploading.set(false); },
    });
  }

  save() {
    const f = this.f;
    if (!String(f.name).trim() || !String(f.description ?? '').trim() || !String(f.category).trim() || !(Number(f.price) >= 0) || f.price === null || f.price === '') {
      this.err.set('Name, description, category and price are required');
      return;
    }
    const body = { name: f.name, description: f.description, category: f.category, price: Number(f.price), image_url: f.image_url || null, available: f.available };
    this.saving.set(true);
    this.err.set('');
    const req = this.id ? this.api.put(`/menu/${this.id}`, body) : this.api.post('/menu', body);
    req.subscribe({
      next: () => this.router.navigateByUrl('/admin/menu'),
      error: (e) => { this.err.set(errMsg(e)); this.saving.set(false); },
    });
  }
}
