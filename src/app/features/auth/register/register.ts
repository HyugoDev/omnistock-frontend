import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { OrganizationService } from '../../../services/organization.service';
import { WarehouseService } from '../../../services/warehouse.service';
import { CategoryService } from '../../../services/category.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly orgService = inject(OrganizationService);
  private readonly warehouseService = inject(WarehouseService);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly currentStepText = signal<string>('Registrando cuenta...');
  readonly errorMessage = signal<string | null>(null);

  readonly registerForm = this.fb.group({
    // 1. Datos del Operador
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],

    // 2. Datos de la Empresa (Better Auth Organization)
    companyName: ['', [Validators.required, Validators.minLength(3)]],
    companySlug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],

    // 3. Datos del Almacén / Local Principal
    warehouseName: ['Bodega Central', [Validators.required]],
    warehouseCode: ['BOD-CENTRAL', [Validators.required, Validators.maxLength(20)]],
    warehouseAddress: ['']
  });

  onCompanyNameChange(name: string): void {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    this.registerForm.patchValue({ companySlug: slug });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.currentStepText.set('1/4 Creando usuario en Better Auth...');

    const val = this.registerForm.getRawValue();

    // 1. Registrar usuario en Better Auth
    this.authService.register({
      name: val.name!,
      email: val.email!,
      password: val.password!
    }).pipe(
      // 2. Crear Organización
      switchMap(() => {
        this.currentStepText.set('2/4 Configurando empresa multi-tenant...');
        return this.orgService.createOrganization({
          name: val.companyName!.trim(),
          slug: val.companySlug!.trim()
        });
      }),
      // 3. Crear Almacén / Bodega Inicial
      switchMap(() => {
        this.currentStepText.set('3/4 Creando almacén principal...');
        return this.warehouseService.createWarehouse({
          code: val.warehouseCode!.trim().toUpperCase(),
          name: val.warehouseName!.trim(),
          address: val.warehouseAddress ? val.warehouseAddress.trim() : undefined
        });
      }),
      // 4. Crear Categorías iniciales por defecto
      switchMap(() => {
        this.currentStepText.set('4/4 Inicializando categorías estándar...');
        return this.categoryService.createCategory({
          name: 'General',
          description: 'Artículos generales de consumo y catálogo estándar'
        });
      })
    ).subscribe({
      next: () => {
        // Categorías secundarias recomendadas en segundo plano
        this.categoryService.createCategory({ name: 'Lotes & Perecederos', description: 'Control de caducidad FEFO' }).subscribe();
        this.categoryService.createCategory({ name: 'Herramientas & Activos', description: 'Control de seriales y préstamos' }).subscribe();

        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error durante el onboarding inicial. Revisa los datos ingresados.');
      }
    });
  }
}
