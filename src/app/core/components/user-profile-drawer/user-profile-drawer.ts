import { Component, inject, signal, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ActiveSession } from '../../../models/auth.model';

@Component({
  selector: 'app-user-profile-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-profile-drawer.html',
})
export class UserProfileDrawer {
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly activeTab = signal<'profile' | 'security' | 'sessions'>('profile');
  readonly isSaving = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Sesiones activas
  readonly sessions = signal<ActiveSession[]>([]);
  readonly isLoadingSessions = signal(false);

  // Formulario Perfil
  readonly profileForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
  });

  // Formulario Seguridad / Contraseña
  readonly passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required, Validators.minLength(8)]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
    revokeOtherSessions: [true],
  });

  constructor() {
    // Sincronizar datos del usuario actual cuando cambie la señal
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.profileForm.patchValue({
          name: user.name,
        });
      }

      // Si el drawer se abre y estamos en la pestaña de sesiones, cargarlas
      if (this.authService.isProfileDrawerOpen() && this.activeTab() === 'sessions') {
        this.loadSessions();
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.authService.isProfileDrawerOpen()) {
      this.close();
    }
  }

  setTab(tab: 'profile' | 'security' | 'sessions'): void {
    this.activeTab.set(tab);
    this.clearAlerts();
    if (tab === 'sessions') {
      this.loadSessions();
    }
  }

  close(): void {
    this.clearAlerts();
    this.authService.closeProfileDrawer();
  }

  // --- 1. Guardar Perfil ---
  onSaveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.clearAlerts();

    const { name } = this.profileForm.getRawValue();

    this.authService.updateProfile({ name: name! }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.successMessage.set('Perfil actualizado exitosamente.');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.message || 'Error al actualizar el perfil.');
      },
    });
  }

  // --- 2. Cambiar Contraseña ---
  onChangePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword, revokeOtherSessions } =
      this.passwordForm.getRawValue();

    if (newPassword !== confirmPassword) {
      this.errorMessage.set('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    this.isSaving.set(true);
    this.clearAlerts();

    this.authService
      .changePassword({
        currentPassword: currentPassword!,
        newPassword: newPassword!,
        revokeOtherSessions: !!revokeOtherSessions,
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.passwordForm.reset({ revokeOtherSessions: true });
          this.successMessage.set(
            revokeOtherSessions
              ? 'Contraseña actualizada y demás sesiones cerradas correctamente.'
              : 'Contraseña actualizada correctamente.'
          );
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(
            err.error?.message || 'Error al cambiar contraseña. Verifique su contraseña actual.'
          );
        },
      });
  }

  // --- 3. Cargar y Gestionar Sesiones ---
  loadSessions(): void {
    this.isLoadingSessions.set(true);
    this.authService.listSessions().subscribe({
      next: (list) => {
        this.isLoadingSessions.set(false);
        const currentToken = this.authService.token();
        const formatted = (list || []).map((s) => ({
          ...s,
          isCurrent: s.token === currentToken,
        }));
        this.sessions.set(formatted);
      },
      error: () => {
        this.isLoadingSessions.set(false);
      },
    });
  }

  onRevokeSession(token: string): void {
    this.authService.revokeSession(token).subscribe({
      next: () => {
        this.sessions.update((prev) => prev.filter((s) => s.token !== token));
        this.successMessage.set('Sesión remota cerrada con éxito.');
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'No se pudo revocar la sesión.');
      },
    });
  }

  onRevokeOtherSessions(): void {
    this.authService.revokeOtherSessions().subscribe({
      next: () => {
        const currentToken = this.authService.token();
        this.sessions.update((prev) => prev.filter((s) => s.token === currentToken));
        this.successMessage.set('Todas las demás sesiones fueron cerradas.');
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error al cerrar las demás sesiones.');
      },
    });
  }

  private clearAlerts(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }
}
