import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const t = auth.token();
  const r = t && !req.headers.has('Authorization') ? req.clone({ setHeaders: { Authorization: `Bearer ${t}` } }) : req;
  return next(r).pipe(
    catchError((err) => {
      // Expired or invalid session: send the user back to the login page
      if (err.status === 401 && t && !req.url.includes('/auth/')) auth.logout();
      return throwError(() => err);
    })
  );
};
