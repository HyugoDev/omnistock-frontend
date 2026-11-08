import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProductBatch } from '../models/product.model';

export interface BatchRequest {
  batchNumber: string;
  productId: number;
  warehouseId: number;
  manufacturingDate?: string | null;
  expirationDate: string;
  initialQuantity: number;
  unitCost?: number | null;
}

export interface FefoDispatchRequest {
  productId: number;
  warehouseId: number;
  quantity: number;
  referenceDocument?: string;
  notes?: string;
}

export interface FefoAllocation {
  batchId: number;
  batchNumber: string;
  expirationDate: string;
  allocatedQuantity: number;
  remainingBatchQuantity: number;
}

export interface FefoDispatchResponse {
  productId: number;
  productName: string;
  warehouseId: number;
  warehouseName: string;
  requestedQuantity: number;
  dispatchedQuantity: number;
  fullyDispatched: boolean;
  allocations: FefoAllocation[];
}

@Injectable({
  providedIn: 'root'
})
export class BatchService {
  private readonly http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/v1/batches`;

  public productBatches = signal<ProductBatch[]>([]);
  public isLoading = signal<boolean>(false);

  getBatchesByProduct(productId: number): Observable<ProductBatch[]> {
    this.isLoading.set(true);
    return this.http.get<ProductBatch[]>(`${this.apiUrl}/product/${productId}`).pipe(
      tap({
        next: (data) => {
          this.productBatches.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  createBatch(payload: BatchRequest): Observable<ProductBatch> {
    return this.http.post<ProductBatch>(this.apiUrl, payload).pipe(
      tap((newBatch) => {
        this.productBatches.update(list => [newBatch, ...list]);
      })
    );
  }

  dispatchFefo(payload: FefoDispatchRequest): Observable<FefoDispatchResponse> {
    return this.http.post<FefoDispatchResponse>(`${this.apiUrl}/fefo-dispatch`, payload).pipe(
      tap(() => {
        // Refrescar lotes tras el despacho
        this.getBatchesByProduct(payload.productId).subscribe();
      })
    );
  }

  getBatchesNearExpiration(daysThreshold: number = 30): Observable<ProductBatch[]> {
    return this.http.get<ProductBatch[]>(`${this.apiUrl}/near-expiration?daysThreshold=${daysThreshold}`);
  }
}
