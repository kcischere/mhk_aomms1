import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from './auth.service';

// Only logged-in users with one of the given roles may open the route
export const authGuard = (...roles: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const u = auth.user();
  if (!u) return router.createUrlTree(['/login']);
  if (roles.length && !roles.includes(u.role)) return router.createUrlTree([auth.homeFor(u.role)]);
  return true;
};

// Login and register pages: logged-in users go straight to their own area
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const u = auth.user();
  return u ? router.createUrlTree([auth.homeFor(u.role)]) : true;
};
