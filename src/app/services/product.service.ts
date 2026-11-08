import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProductRequest, ProductResponse, ProductType } from '../models/product.model';

@Injectable({
    providedIn: 'root'
})
export class ProductService {

    private readonly http = inject(HttpClient);

    // URL base de environment + ruta específica del recurso
    private apiUrl = `${environment.apiUrl}/v1/products`;

    // Signals para el estado reactivo
    public products = signal<ProductResponse[]>([]);
    public isLoading = signal<boolean>(false);

    // Filtros de búsqueda y tipo
    public selectedType = signal<string>('ALL');
    public searchQuery = signal<string>('');

    // --- MÉTRICAS REACTIVAS PARA EL DASHBOARD Y GESTIÓN ---
    public totalProducts = computed(() => this.products().length);

    public lowStockProducts = computed(() => this.products().filter(p => p.requiresRestock));
    public lowStockCount = computed(() => this.lowStockProducts().length);
    
    public totalInventoryValue = computed(() =>
        this.products().reduce((total, p) => total + (p.salePrice * p.currentStock), 0)
    );

    // Desglose por tipo universal de producto
    public standardProducts = computed(() => 
        this.products().filter(p => (p.productType || 'STANDARD') === 'STANDARD')
    );
    public standardCount = computed(() => this.standardProducts().length);

    public batchProducts = computed(() => 
        this.products().filter(p => p.productType === 'BATCH_EXPIRABLE')
    );
    public batchCount = computed(() => this.batchProducts().length);

    public serializedProducts = computed(() => 
        this.products().filter(p => p.productType === 'SERIALIZED_ASSET')
    );
    public serializedCount = computed(() => this.serializedProducts().length);

    // Productos filtrados dinámicamente según pestaña y término de búsqueda
    public filteredProducts = computed(() => {
        const type = this.selectedType();
        const query = this.searchQuery().trim().toLowerCase();

        return this.products().filter(product => {
            const matchesType = type === 'ALL' || product.productType === type;
            const matchesQuery = !query || 
                product.name.toLowerCase().includes(query) ||
                product.barcode.toLowerCase().includes(query) ||
                (product.sku && product.sku.toLowerCase().includes(query)) ||
                (product.categoryName && product.categoryName.toLowerCase().includes(query));

            return matchesType && matchesQuery;
        });
    });

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
