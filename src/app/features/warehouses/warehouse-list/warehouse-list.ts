import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WarehouseService, WarehouseStockItem } from '../../../services/warehouse.service';
import { Warehouse } from '../../../models/product.model';

@Component({
  selector: 'app-warehouse-list',
  standalone: true,
  imports: [CommonModule, NgClass, ReactiveFormsModule],
  templateUrl: './warehouse-list.html',
})
export class WarehouseList implements OnInit {
  protected readonly warehouseService = inject(WarehouseService);
  private readonly fb = inject(FormBuilder);

  public isCreateModalOpen = signal<boolean>(false);
  public isStockModalOpen = signal<boolean>(false);
  public selectedWarehouse = signal<Warehouse | null>(null);
  public warehouseStock = signal<WarehouseStockItem[]>([]);
  public isLoadingStock = signal<boolean>(false);
  public isSubmitting = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);
  public editingWarehouseId = signal<number | null>(null);

  public warehouseForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    code: ['', [Validators.required, Validators.maxLength(20)]],
    address: ['', [Validators.maxLength(255)]],
    isTransit: [false]
  });

  ngOnInit(): void {
    this.warehouseService.loadWarehouses().subscribe();
  }

  openCreateModal(): void {
    this.editingWarehouseId.set(null);
    this.errorMessage.set(null);
    this.warehouseForm.reset({ isTransit: false });
    this.warehouseForm.get('code')?.enable();
    this.isCreateModalOpen.set(true);
  }

  openEditModal(warehouse: Warehouse): void {
    this.editingWarehouseId.set(warehouse.id);
    this.errorMessage.set(null);
    this.warehouseForm.patchValue({
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address || '',
      isTransit: warehouse.isTransit
    });
    this.warehouseForm.get('code')?.disable(); // El código no se edita para integridad
    this.isCreateModalOpen.set(true);
  }

  closeModal(): void {
    this.isCreateModalOpen.set(false);
    this.editingWarehouseId.set(null);
  }

  submitWarehouse(): void {
    if (this.warehouseForm.invalid) {
      this.warehouseForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.warehouseForm.getRawValue();
    const editId = this.editingWarehouseId();

    if (editId) {
      this.warehouseService.updateWarehouse(editId, {
        name: val.name.trim(),
        address: val.address ? val.address.trim() : undefined,
        isTransit: val.isTransit
      }).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.message || 'Error al actualizar el almacén');
        }
      });
    } else {
      this.warehouseService.createWarehouse({
        code: val.code.trim().toUpperCase(),
        name: val.name.trim(),
        address: val.address ? val.address.trim() : undefined,
        isTransit: val.isTransit
      }).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.message || 'Error al registrar el almacén');
        }
      });
    }
  }

  openStockModal(warehouse: Warehouse): void {
    this.selectedWarehouse.set(warehouse);
    this.isLoadingStock.set(true);
    this.warehouseStock.set([]);
    this.isStockModalOpen.set(true);

    this.warehouseService.getStockByWarehouse(warehouse.id).subscribe({
      next: (items) => {
        this.warehouseStock.set(items);
        this.isLoadingStock.set(false);
      },
      error: () => this.isLoadingStock.set(false)
    });
  }

  closeStockModal(): void {
    this.isStockModalOpen.set(false);
    this.selectedWarehouse.set(null);
  }

  selectAsActive(warehouse: Warehouse): void {
    this.warehouseService.selectWarehouse(warehouse);
  }

  deactivateWarehouse(warehouse: Warehouse): void {
    if (confirm(`¿Estás seguro de desactivar la bodega "${warehouse.name}"?`)) {
      this.warehouseService.deleteWarehouse(warehouse.id).subscribe({
        error: (err) => alert(err.error?.message || 'Error al desactivar bodega')
      });
    }
  }
}
