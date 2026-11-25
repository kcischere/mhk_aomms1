import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API } from './config';

export const errMsg = (e: any): string =>
  e?.error?.message || (e?.status === 0 ? 'Cannot reach the server. Check that the backend is running' : 'Something went wrong. Try again');

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);

  private params(p?: Record<string, any>) {
    let hp = new HttpParams();
    Object.entries(p ?? {}).forEach(([k, v]) => {
      if (v !== '' && v != null) hp = hp.set(k, String(v));
    });
    return hp;
  }

  get<T = any>(path: string, params?: Record<string, any>) { return this.http.get<T>(API + path, { params: this.params(params) }); }
  post<T = any>(path: string, body: any = {}) { return this.http.post<T>(API + path, body); }
  put<T = any>(path: string, body: any = {}) { return this.http.put<T>(API + path, body); }
  patch<T = any>(path: string, body: any = {}) { return this.http.patch<T>(API + path, body); }
  delete<T = any>(path: string) { return this.http.delete<T>(API + path); }
}
