import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AssetStatus, ProductSerial } from '../models/product.model';

export interface SerialRequest {
  serialNumber: string;
  productId: number;
  warehouseId: number;
  notes?: string;
}

export interface SerialActionRequest {
  newStatus: AssetStatus;
  assignedTo?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SerialService {
  private readonly http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/v1/serials`;

  public productSerials = signal<ProductSerial[]>([]);
  public isLoading = signal<boolean>(false);

  getSerialsByProduct(productId: number): Observable<ProductSerial[]> {
    this.isLoading.set(true);
    return this.http.get<ProductSerial[]>(`${this.apiUrl}/product/${productId}`).pipe(
      tap({
        next: (data) => {
          this.productSerials.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  registerSerial(payload: SerialRequest): Observable<ProductSerial> {
    return this.http.post<ProductSerial>(this.apiUrl, payload).pipe(
      tap((newSerial) => {
        this.productSerials.update(list => [newSerial, ...list]);
      })
    );
  }

  updateStatus(serialId: number, payload: SerialActionRequest): Observable<ProductSerial> {
    return this.http.put<ProductSerial>(`${this.apiUrl}/${serialId}/status`, payload).pipe(
      tap((updated) => {
        this.productSerials.update(list => 
          list.map(s => s.id === updated.id ? updated : s)
        );
      })
    );
  }
}
