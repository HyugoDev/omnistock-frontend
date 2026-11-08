import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Warehouse } from '../models/product.model';

export interface WarehouseTransferRequest {
  originWarehouseId: number;
  destinationWarehouseId: number;
  productId: number;
  quantity: number;
  referenceDocument?: string;
  notes?: string;
}

export interface WarehouseStockItem {
  id: number;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  productId: number;
  productBarcode: string;
  productSku?: string;
  productName: string;
  quantity: number;
  minStock: number;
}

@Injectable({
  providedIn: 'root'
})
export class WarehouseService {
  private readonly http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/v1/warehouses`;

  public warehouses = signal<Warehouse[]>([]);
  public activeWarehouse = signal<Warehouse | null>(null);
  public isLoading = signal<boolean>(false);

  // Almacenes disponibles que no sean de tránsito para operaciones comunes
  public physicalWarehouses = computed(() => 
    this.warehouses().filter(w => !w.isTransit && w.active)
  );

  constructor() {
    this.loadWarehouses().subscribe();
  }

  loadWarehouses(): Observable<Warehouse[]> {
    this.isLoading.set(true);
    return this.http.get<Warehouse[]>(this.apiUrl).pipe(
      tap({
        next: (list) => {
          this.warehouses.set(list);
          this.isLoading.set(false);

          // Recuperar almacén seleccionado o asignar el primero por defecto
          const savedId = localStorage.getItem('omnistock_active_warehouse_id');
          if (savedId) {
            const found = list.find(w => w.id === Number(savedId));
            if (found) {
              this.activeWarehouse.set(found);
              return;
            }
          }

          const defaultWarehouse = list.find(w => !w.isTransit && w.active) || list[0] || null;
          if (defaultWarehouse) {
            this.selectWarehouse(defaultWarehouse);
          }
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  selectWarehouse(warehouse: Warehouse): void {
    this.activeWarehouse.set(warehouse);
    localStorage.setItem('omnistock_active_warehouse_id', warehouse.id.toString());
  }

  createWarehouse(payload: { code: string; name: string; address?: string; isTransit?: boolean }): Observable<Warehouse> {
    return this.http.post<Warehouse>(this.apiUrl, payload).pipe(
      tap((newWh) => {
        this.warehouses.update(list => [...list, newWh]);
        if (!this.activeWarehouse()) {
          this.selectWarehouse(newWh);
        }
      })
    );
  }

  updateWarehouse(id: number, payload: { name: string; address?: string; active?: boolean; isTransit?: boolean }): Observable<Warehouse> {
    return this.http.put<Warehouse>(`${this.apiUrl}/${id}`, payload).pipe(
      tap((updated) => {
        this.warehouses.update(list => list.map(w => w.id === id ? updated : w));
        if (this.activeWarehouse()?.id === id) {
          this.activeWarehouse.set(updated);
        }
      })
    );
  }

  deleteWarehouse(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.warehouses.update(list => list.filter(w => w.id !== id));
        if (this.activeWarehouse()?.id === id) {
          const remaining = this.warehouses().find(w => w.active && !w.isTransit) || null;
          this.activeWarehouse.set(remaining);
        }
      })
    );
  }

  getStockByWarehouse(warehouseId: number): Observable<WarehouseStockItem[]> {
    return this.http.get<WarehouseStockItem[]>(`${this.apiUrl}/${warehouseId}/stock`);
  }

  transferStock(payload: WarehouseTransferRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/transfers`, payload);
  }
}
