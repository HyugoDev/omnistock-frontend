import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../../../services/product.service';
import { CategoryService } from '../../../services/category.service';
import { ProductRequest } from '../../../models/product.model';

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

  // Formulario Reactivo con validaciones estrictas
  public productForm: FormGroup = this.fb.group({
    barcode: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(500)]],
    purchasePrice: [null, [Validators.min(0)]],
    salePrice: [null, [Validators.required, Validators.min(0.01)]],
    currentStock: [0, [Validators.required, Validators.min(0)]],
    minStock: [5, [Validators.required, Validators.min(0)]],
    categoryId: [null, [Validators.required]]
  });

  ngOnInit(): void {
    // Cargar productos y categorías al iniciar
    this.productService.getAllProducts().subscribe();
    this.categoryService.getAllCategories().subscribe();
  }

  // Abrir y cerrar el modal
  openModal(): void {
    this.errorMessage.set(null);
    this.productForm.reset({ currentStock: 0, minStock: 5 });
    this.isModalOpen.set(true);
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

    const formValue: ProductRequest = this.productForm.value;

    this.productService.createProduct(formValue).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        // Muestra el mensaje exacto que configuramos en GlobalExceptionHandler de Spring Boot
        this.errorMessage.set(err.error?.message || 'Error al guardar el producto');
      }
    });
  }

  // Eliminar (Soft Delete en Spring Boot)
  onDeleteProduct(id: number, name: string): void {
    if (confirm(`¿Estás seguro de desactivar el producto "${name}"?`)) {
      this.productService.deleteProduct(id).subscribe({
        error: (err) => alert(err.error?.message || 'Error al eliminar producto')
      });
    }
  }
}
