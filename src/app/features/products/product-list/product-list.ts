import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../../../services/product.service';
import { CategoryService } from '../../../services/category.service';
import { ProductRequest, ProductType, UnitOfMeasure } from '../../../models/product.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, NgClass, ReactiveFormsModule],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css'
})
export class ProductList implements OnInit {

  protected readonly productService = inject(ProductService);
  protected readonly categoryService = inject(CategoryService);
  private readonly fb = inject(FormBuilder);

  // Señales de control del Modal y Errores
  public isModalOpen = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);
  public isSubmitting = signal<boolean>(false);

  // Formulario Reactivo con soporte para Inventario Universal
  public productForm: FormGroup = this.fb.group({
    barcode: ['', [Validators.required, Validators.maxLength(50)]],
    sku: ['', [Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(500)]],
    productType: ['STANDARD' as ProductType, [Validators.required]],
    unitOfMeasure: ['UNIT' as UnitOfMeasure, [Validators.required]],
    purchasePrice: [null, [Validators.min(0)]],
    salePrice: [null, [Validators.required, Validators.min(0.01)]],
    currentStock: [0, [Validators.required, Validators.min(0)]],
    minStock: [5, [Validators.required, Validators.min(0)]],
    categoryId: [null, [Validators.required]],
    attributesJson: ['']
  });

  // Opciones de unidades de medida
  public readonly unitOptions: { value: UnitOfMeasure; label: string }[] = [
    { value: 'UNIT', label: 'Unidades / Pza' },
    { value: 'KILOGRAM', label: 'Kilogramos (Kg)' },
    { value: 'GRAM', label: 'Gramos (g)' },
    { value: 'LITER', label: 'Litros (L)' },
    { value: 'METER', label: 'Metros (m)' },
    { value: 'BOX', label: 'Cajas / Paquetes' }
  ];

  ngOnInit(): void {
    this.productService.getAllProducts().subscribe();
    this.categoryService.getAllCategories().subscribe();
  }

  // Filtrado por Pestaña
  setTypeFilter(type: string): void {
    this.productService.selectedType.set(type);
  }

  // Búsqueda en vivo
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.productService.searchQuery.set(value);
  }

  clearSearch(): void {
    this.productService.searchQuery.set('');
  }

  // Abrir modal con tipo por defecto o preseleccionado
  openModal(type: ProductType = 'STANDARD'): void {
    this.errorMessage.set(null);
    this.productForm.reset({
      productType: type,
      unitOfMeasure: 'UNIT',
      currentStock: 0,
      minStock: 5
    });
    this.isModalOpen.set(true);
  }

  setFormProductType(type: ProductType): void {
    this.productForm.patchValue({ productType: type });
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  // Guardar nuevo producto (POST a Spring Boot)
  onSubmit(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formValue = this.productForm.value;
    const payload: ProductRequest = {
      barcode: formValue.barcode,
      sku: formValue.sku ? formValue.sku.trim() : null,
      name: formValue.name,
      description: formValue.description ? formValue.description.trim() : null,
      productType: formValue.productType,
      unitOfMeasure: formValue.unitOfMeasure,
      purchasePrice: formValue.purchasePrice,
      salePrice: formValue.salePrice,
      currentStock: formValue.currentStock,
      minStock: formValue.minStock,
      categoryId: formValue.categoryId,
      attributesJson: formValue.attributesJson ? formValue.attributesJson.trim() : null
    };

    this.productService.createProduct(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Error al registrar el producto');
      }
    });
  }

  // Desactivar producto (Soft Delete)
  onDeleteProduct(id: number, name: string): void {
    if (confirm(`¿Estás seguro de desactivar el producto "${name}"?`)) {
      this.productService.deleteProduct(id).subscribe({
        error: (err) => alert(err.error?.message || 'Error al desactivar producto')
      });
    }
  }

  // Helpers para presentación de Badges
  getTypeBadgeClass(type: ProductType | string): string {
    switch (type) {
      case 'BATCH_EXPIRABLE':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'SERIALIZED_ASSET':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'STANDARD':
      default:
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
  }

  getTypeLabel(type: ProductType | string): string {
    switch (type) {
      case 'BATCH_EXPIRABLE':
        return '💊 Lote FEFO';
      case 'SERIALIZED_ASSET':
        return '⚙️ Serializado';
      case 'STANDARD':
      default:
        return '📦 Estándar';
    }
  }
}
