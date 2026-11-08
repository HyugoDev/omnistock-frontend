import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProductRequest, ProductResponse } from '../models/product.model';

@Injectable({
    providedIn: 'root'
})
export class ProductService {

    private readonly http = inject(HttpClient);

    // Construcción limpia: URL base de environment + ruta específica del recurso
    private apiUrl = `${environment.apiUrl}/v1/products`;



    // Signals para el estado reactivo
    public products = signal<ProductResponse[]>([]);
    public isLoading = signal<boolean>(false);

    // --- MÉTRICAS REACTIVAS PARA EL DASHBOARD ---
    // 1. Total de productos
    public totalProducts = computed(() => this.products().length);

    // 2. Lista y conteo de productos con stock bajo
    public lowStockProducts = computed(() => this.products().filter(p => p.requiresRestock));
    public lowStockCount = computed(() => this.lowStockProducts().length);
    
    // 3. Valor total monetizado del inventario
    public totalInventoryValue = computed(() =>
        this.products().reduce((total, p) => total + (p.salePrice * p.currentStock), 0)
    );

    getAllProducts(): Observable<ProductResponse[]> {
        this.isLoading.set(true);
        return this.http.get<ProductResponse[]>(this.apiUrl).pipe(
            tap({
                next: (data) => {
                    this.products.set(data);
                    this.isLoading.set(false);
                },
                error: () => this.isLoading.set(false)
            })
        );
    }

    createProduct(product: ProductRequest): Observable<ProductResponse> {
        return this.http.post<ProductResponse>(this.apiUrl, product).pipe(
            tap((newProduct) => {
                this.products.update((current) => [...current, newProduct]);
            })
        );
    }
    deleteProduct(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
            tap(() => {
                this.products.update((current) => current.filter((p) => p.id !== id));
            })
        );
    }
}