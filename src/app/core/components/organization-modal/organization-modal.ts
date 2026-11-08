import { Component, inject, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OrganizationService } from '../../../services/organization.service';
import { WarehouseService } from '../../../services/warehouse.service';
import { Organization, Member, Invitation } from '../../../models/auth.model';

@Component({
  selector: 'app-organization-modal',
  standalone: true,
  imports: [CommonModule, NgClass, ReactiveFormsModule],
  templateUrl: './organization-modal.html',
})
export class OrganizationModal {
  protected readonly orgService = inject(OrganizationService);
  protected readonly warehouseService = inject(WarehouseService);
  private readonly fb = inject(FormBuilder);

  public activeTab = signal<'manage' | 'members'>('manage');
  public isCreatingOrg = signal<boolean>(false);
  public isInviting = signal<boolean>(false);
  public successMessage = signal<string | null>(null);
  public errorMessage = signal<string | null>(null);

  // Formulario de Nueva Organización
  public createOrgForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    slug: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[a-z0-9-]+$/)]],
    logo: ['']
  });

  // Formulario de Invitación de Miembro con Sede Asignada
  public inviteForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['member', [Validators.required]],
    assignedWarehouseId: [null]
  });

  // Autogenerar slug en base al nombre
  onNameChange(name: string): void {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    this.createOrgForm.patchValue({ slug });
  }

  submitCreateOrg(): void {
    if (this.createOrgForm.invalid) {
      this.createOrgForm.markAllAsTouched();
      return;
    }

    this.isCreatingOrg.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const val = this.createOrgForm.value;
    this.orgService.createOrganization({
      name: val.name.trim(),
      slug: val.slug.trim(),
      logo: val.logo ? val.logo.trim() : undefined
    }).subscribe({
      next: (newOrg) => {
        this.isCreatingOrg.set(false);
        this.successMessage.set(`¡Empresa "${newOrg.name}" creada y activada exitosamente!`);
        this.createOrgForm.reset();
      },
      error: (err) => {
        this.isCreatingOrg.set(false);
        this.errorMessage.set(err.error?.message || 'Error al crear la organización');
      }
    });
  }

  submitInviteMember(): void {
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    const val = this.inviteForm.value;

    // Validación de regla de negocio: Si es miembro operativo, debe tener una sede asignada
    if (val.role === 'member' && !val.assignedWarehouseId) {
      this.errorMessage.set('Debe seleccionar un Local / Bodega para colaboradores con rol Miembro.');
      return;
    }

    this.isInviting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.orgService.inviteMember({
      email: val.email.trim(),
      role: val.role,
      assignedWarehouseId: val.assignedWarehouseId ? val.assignedWarehouseId.toString() : null
    }).subscribe({
      next: () => {
        this.isInviting.set(false);
        this.successMessage.set(`Invitación enviada exitosamente a ${val.email}`);
        this.inviteForm.reset({ role: 'member', assignedWarehouseId: null });
      },
      error: (err) => {
        this.isInviting.set(false);
        this.errorMessage.set(err.error?.message || 'Error al enviar invitación');
      }
    });
  }

  cancelInvite(invitationId: string): void {
    if (confirm('¿Deseas cancelar esta invitación?')) {
      this.orgService.cancelInvitation(invitationId).subscribe({
        error: (err) => alert(err.error?.message || 'Error al cancelar invitación')
      });
    }
  }

  removeMember(memberId: string, memberName?: string): void {
    if (confirm(`¿Estás seguro de remover a "${memberName || 'este miembro'}" de la organización?`)) {
      this.orgService.removeMember(memberId).subscribe({
        error: (err) => alert(err.error?.message || 'Error al remover miembro')
      });
    }
  }

  getWarehouseName(warehouseId?: string | number | null): string {
    if (!warehouseId) return 'Acceso Global';
    const found = this.warehouseService.warehouses().find(w => w.id === Number(warehouseId));
    return found ? `${found.name} (${found.code})` : `Local #${warehouseId}`;
  }
}
