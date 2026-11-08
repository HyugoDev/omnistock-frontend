import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './services/auth.service';
import { WarehouseService } from './services/warehouse.service';
import { OrganizationService } from './services/organization.service';
import { Warehouse } from './models/product.model';
import { UserProfileDrawer } from './core/components/user-profile-drawer/user-profile-drawer';
import { OrganizationModal } from './core/components/organization-modal/organization-modal';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    UserProfileDrawer,
    OrganizationModal
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly authService = inject(AuthService);
  readonly warehouseService = inject(WarehouseService);
  readonly orgService = inject(OrganizationService);

  public isWarehouseDropdownOpen = signal<boolean>(false);
  public isOrgDropdownOpen = signal<boolean>(false);

  constructor() {
    // Sincronizar automáticamente la sede activa para miembros restringidos
    effect(() => {
      const isGlobal = this.orgService.isGlobalAdmin();
      const assignedId = this.orgService.assignedWarehouseId();
      const warehouses = this.warehouseService.warehouses();

      if (!isGlobal && assignedId && warehouses.length > 0) {
        const assignedWh = warehouses.find(w => w.id === assignedId);
        if (assignedWh && this.warehouseService.activeWarehouse()?.id !== assignedWh.id) {
          this.warehouseService.selectWarehouse(assignedWh);
        }
      }
    });
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.orgService.loadOrganizations().subscribe();
    }
  }

  toggleOrgDropdown(): void {
    this.isOrgDropdownOpen.update(v => !v);
    this.isWarehouseDropdownOpen.set(false);
  }

  toggleWarehouseDropdown(): void {
    if (!this.orgService.isGlobalAdmin()) return;
    this.isWarehouseDropdownOpen.update(v => !v);
    this.isOrgDropdownOpen.set(false);
  }

  selectWarehouse(warehouse: Warehouse): void {
    if (!this.orgService.isGlobalAdmin()) return;
    this.warehouseService.selectWarehouse(warehouse);
    this.isWarehouseDropdownOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }
}
