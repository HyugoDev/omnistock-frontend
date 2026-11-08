import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './services/auth.service';
import { WarehouseService } from './services/warehouse.service';
import { Warehouse } from './models/product.model';
import { UserProfileDrawer } from './core/components/user-profile-drawer/user-profile-drawer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, UserProfileDrawer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly authService = inject(AuthService);
  readonly warehouseService = inject(WarehouseService);

  public isWarehouseDropdownOpen = signal<boolean>(false);

  toggleWarehouseDropdown(): void {
    this.isWarehouseDropdownOpen.update(v => !v);
  }

  selectWarehouse(warehouse: Warehouse): void {
    this.warehouseService.selectWarehouse(warehouse);
    this.isWarehouseDropdownOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }
}
