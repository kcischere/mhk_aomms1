import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { API } from './config';

export type Role = 'admin' | 'cashier' | 'customer';
export interface User { id: number; name: string; email?: string; role: Role; }
interface AuthRes { token: string; user: User; }

const KEY = 'mhk_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private state = signal<AuthRes | null>(this.load());
  user = computed(() => this.state()?.user ?? null);
  token = computed(() => this.state()?.token ?? null);

  private load(): AuthRes | null {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
  }

  homeFor(role: Role): string {
    return role === 'admin' ? '/admin/dashboard' : role === 'cashier' ? '/cashier/counter' : '/customer/menu';
  }

  login(email: string, password: string) {
    return this.http.post<AuthRes>(`${API}/auth/login`, { email, password }).pipe(tap((r) => this.setSession(r)));
  }

  register(name: string, email: string, password: string) {
    return this.http.post<AuthRes>(`${API}/auth/register`, { name, email, password }).pipe(tap((r) => this.setSession(r)));
  }

  setSession(r: AuthRes) {
    localStorage.setItem(KEY, JSON.stringify(r));
    this.state.set(r);
  }

  // Forget the session without redirecting (used when a customer tries the staff login)
  clear() {
    localStorage.removeItem(KEY);
    this.state.set(null);
  }

  logout() {
    const t = this.token();
    if (t) this.http.post(`${API}/auth/logout`, {}, { headers: { Authorization: `Bearer ${t}` } }).subscribe({ error: () => {} });
    this.clear();
    this.router.navigate(['/login']);
  }
}
