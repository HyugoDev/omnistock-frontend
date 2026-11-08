import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  User,
  AuthResponse,
  SessionResponse,
  LoginCredentials,
  RegisterCredentials,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ActiveSession,
} from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authUrl = environment.authUrl;

  private readonly TOKEN_KEY = 'omnistock_token';
  private readonly USER_KEY = 'omnistock_user';

  // Signals para reactividad de sesión
  readonly currentUser = signal<User | null>(this.getStoredUser());
  readonly token = signal<string | null>(this.getStoredToken());
  readonly isAuthenticated = computed(() => !!this.currentUser() && !!this.token());

  // Signal para controlar el Slide-over Drawer de Perfil
  readonly isProfileDrawerOpen = signal<boolean>(false);

  openProfileDrawer(): void {
    this.isProfileDrawerOpen.set(true);
  }

  closeProfileDrawer(): void {
    this.isProfileDrawerOpen.set(false);
  }

  /**
   * Inicia sesión contra Better Auth (Bun + Hono)
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.authUrl}/sign-in/email`, credentials, {
        withCredentials: true,
      })
      .pipe(
        tap((res) => {
          this.setSession(res.token, res.user);
        }),
        catchError((err) => {
          console.error('Error al iniciar sesión:', err);
          return throwError(() => err);
        })
      );
  }

  /**
   * Registra un nuevo usuario
   */
  register(credentials: RegisterCredentials): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.authUrl}/sign-up/email`, credentials, {
        withCredentials: true,
      })
      .pipe(
        tap((res) => {
          this.setSession(res.token, res.user);
        }),
        catchError((err) => {
          console.error('Error al registrar usuario:', err);
          return throwError(() => err);
        })
      );
  }

  /**
   * Actualiza los datos de perfil (nombre, avatar)
   */
  updateProfile(data: UpdateProfileRequest): Observable<{ user: User }> {
    return this.http
      .post<{ user: User }>(`${this.authUrl}/update-user`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((res) => {
          if (res?.user) {
            this.currentUser.set(res.user);
            localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
          } else {
            // Si Better Auth devuelve vacío o formato directo
            const current = this.currentUser();
            if (current) {
              const updated = { ...current, name: data.name, image: data.image || current.image };
              this.currentUser.set(updated);
              localStorage.setItem(this.USER_KEY, JSON.stringify(updated));
            }
          }
        })
      );
  }

  /**
   * Cambia la contraseña del usuario
   */
  changePassword(data: ChangePasswordRequest): Observable<{ status: boolean }> {
    return this.http.post<{ status: boolean }>(`${this.authUrl}/change-password`, data, {
      withCredentials: true,
    });
  }

  /**
   * Lista todas las sesiones activas del usuario en Better Auth
   */
  listSessions(): Observable<ActiveSession[]> {
    return this.http.get<ActiveSession[]>(`${this.authUrl}/list-sessions`, {
      withCredentials: true,
    });
  }

  /**
   * Cierra/revoca una sesión específica en otro dispositivo
   */
  revokeSession(token: string): Observable<{ status: boolean }> {
    return this.http.post<{ status: boolean }>(
      `${this.authUrl}/revoke-session`,
      { token },
      { withCredentials: true }
    );
  }

  /**
   * Cierra todas las sesiones excepto la actual
   */
  revokeOtherSessions(): Observable<{ status: boolean }> {
    return this.http.post<{ status: boolean }>(
      `${this.authUrl}/revoke-other-sessions`,
      {},
      { withCredentials: true }
    );
  }

  /**
   * Cierra la sesión activa
   */
  logout(): void {
    this.http
      .post(`${this.authUrl}/sign-out`, {}, { withCredentials: true })
      .subscribe({
        complete: () => this.clearSession(),
        error: () => this.clearSession(),
      });
  }

  /**
   * Verifica la sesión activa con Better Auth
   */
  checkSession(): Observable<SessionResponse | null> {
    const currentToken = this.token();
    if (!currentToken) {
      this.clearSession();
      return throwError(() => new Error('No hay sesión guardada'));
    }

    return this.http
      .get<SessionResponse>(`${this.authUrl}/get-session`, {
        headers: { Authorization: `Bearer ${currentToken}` },
        withCredentials: true,
      })
      .pipe(
        tap((res) => {
          if (res && res.user) {
            this.currentUser.set(res.user);
            localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
          }
        }),
        catchError((err) => {
          this.clearSession();
          return throwError(() => err);
        })
      );
  }

  private setSession(token: string, user: User): void {
    this.token.set(token);
    this.currentUser.set(user);
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private clearSession(): void {
    this.token.set(null);
    this.currentUser.set(null);
    this.isProfileDrawerOpen.set(false);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/login']);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as User;
    } catch {
      return null;
    }
  }
}
