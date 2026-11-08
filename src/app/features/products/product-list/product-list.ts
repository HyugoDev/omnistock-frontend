import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule, CurrencyPipe, NgClass } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../../../services/product.service';
import { CategoryService } from '../../../services/category.service';
import { WarehouseService } from '../../../services/warehouse.service';
import { OrganizationService } from '../../../services/organization.service';
import { BatchService, FefoAllocation } from '../../../services/batch.service';
import { SerialService } from '../../../services/serial.service';
import { ProductRequest, ProductResponse, ProductType, UnitOfMeasure, ProductSerial, AssetStatus } from '../../../models/product.model';

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
  protected readonly warehouseService = inject(WarehouseService);
  protected readonly orgService = inject(OrganizationService);
  protected readonly batchService = inject(BatchService);
  protected readonly serialService = inject(SerialService);
  private readonly fb = inject(FormBuilder);

  constructor() {
    // Reaccionar a cambios en la sede activa para cargar el stock local correspondiente
    effect(() => {
      const activeWh = this.warehouseService.activeWarehouse();
      this.productService.getAllProducts(activeWh?.id).subscribe();
    });
  }

  // Señales de control del Modal y Errores
  public isModalOpen = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);
  public isSubmitting = signal<boolean>(false);

  // Modales de Operaciones Especiales (Fase 3)
  public isTransferModalOpen = signal<boolean>(false);
  public isBatchModalOpen = signal<boolean>(false);
  public isSerialModalOpen = signal<boolean>(false);
  public selectedProduct = signal<ProductResponse | null>(null);

  // Despacho FEFO resultado
  public fefoDispatchSuccess = signal<string | null>(null);
  public fefoAllocations = signal<FefoAllocation[]>([]);
  public isDispatchingFefo = signal<boolean>(false);

  // Formulario Reactivo con soporte para Inventario Universal Adaptativo
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
    attributesJson: [''],
    // Campos adaptativos opcionales
    initialBatchNumber: [''],
    initialExpirationDate: [''],
    initialManufacturingDate: [''],
    initialSerialNumber: [''],
    initialSerialNotes: ['']
  });

  // Formulario de Transferencia entre Bodegas
  public transferForm: FormGroup = this.fb.group({
    originWarehouseId: [null, [Validators.required]],
    destinationWarehouseId: [null, [Validators.required]],
    productId: [null, [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(0.01)]],
    referenceDocument: [''],
    notes: ['']
  });

  // Formulario de Nuevo Lote
  public newBatchForm: FormGroup = this.fb.group({
    batchNumber: ['', [Validators.required, Validators.maxLength(50)]],
    expirationDate: ['', [Validators.required]],
    manufacturingDate: [''],
    initialQuantity: [10, [Validators.required, Validators.min(0.01)]],
    unitCost: [null, [Validators.min(0)]]
  });

  // Formulario de Despacho FEFO
  public fefoDispatchForm: FormGroup = this.fb.group({
    quantity: [1, [Validators.required, Validators.min(0.01)]],
    referenceDocument: ['POS-VENTA-FEFO'],
    notes: ['']
  });

  // Formulario de Nuevo Serial
  public newSerialForm: FormGroup = this.fb.group({
    serialNumber: ['', [Validators.required, Validators.maxLength(100)]],
    notes: ['']
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
    this.categoryService.getAllCategories().subscribe();
  }

  loadProducts(): void {
    const activeWhId = this.warehouseService.activeWarehouse()?.id;
    this.productService.getAllProducts(activeWhId).subscribe();
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

  // Abrir modal de creación
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

  // Guardar nuevo producto (POST a Spring Boot con inicialización adaptativa opcional)
  onSubmit(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formValue = this.productForm.value;
    const activeWh = this.warehouseService.activeWarehouse();

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
      next: (createdProduct) => {
        // Inicialización adaptativa: Si se llenó lote inicial
        if (formValue.productType === 'BATCH_EXPIRABLE' && formValue.initialBatchNumber && formValue.initialExpirationDate && activeWh) {
          this.batchService.createBatch({
            batchNumber: formValue.initialBatchNumber,
            productId: createdProduct.id,
            warehouseId: activeWh.id,
            expirationDate: formValue.initialExpirationDate,
            manufacturingDate: formValue.initialManufacturingDate || null,
            initialQuantity: formValue.currentStock || 1,
            unitCost: formValue.purchasePrice
          }).subscribe();
        }

        // Inicialización adaptativa: Si se llenó número de serie inicial
        if (formValue.productType === 'SERIALIZED_ASSET' && formValue.initialSerialNumber && activeWh) {
          this.serialService.registerSerial({
            serialNumber: formValue.initialSerialNumber,
            productId: createdProduct.id,
            warehouseId: activeWh.id,
            notes: formValue.initialSerialNotes || 'Registro inicial'
          }).subscribe();
        }

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

  // ==========================================
  // MODAL TRANSFERENCIA ENTRE BODEGAS
  // ==========================================
  openTransferModal(product?: ProductResponse): void {
    const originId = this.warehouseService.activeWarehouse()?.id || null;
    this.transferForm.reset({
      originWarehouseId: originId,
      productId: product ? product.id : null,
      quantity: 1,
      referenceDocument: 'TRF-' + Math.floor(1000 + Math.random() * 9000)
    });
    this.isTransferModalOpen.set(true);
  }

  closeTransferModal(): void {
    this.isTransferModalOpen.set(false);
  }

  submitTransfer(): void {
    if (this.transferForm.invalid) {
      this.transferForm.markAllAsTouched();
      return;
    }

    const value = this.transferForm.value;
    this.warehouseService.transferStock(value).subscribe({
      next: (res) => {
        alert(res.message || 'Transferencia realizada con éxito');
        this.closeTransferModal();
        this.loadProducts();
      },
      error: (err) => {
        alert(err.error?.message || 'Error al transferir existencias');
      }
    });
  }

  // ==========================================
  // MODAL LOTES & DESPACHO FEFO
  // ==========================================
  openBatchModal(product: ProductResponse): void {
    this.selectedProduct.set(product);
    this.fefoDispatchSuccess.set(null);
    this.fefoAllocations.set([]);
    this.newBatchForm.reset({ initialQuantity: 10 });
    this.fefoDispatchForm.reset({ quantity: 1, referenceDocument: 'POS-FEFO-' + Date.now().toString().slice(-4) });
    this.batchService.getBatchesByProduct(product.id).subscribe();
    this.isBatchModalOpen.set(true);
  }

  closeBatchModal(): void {
    this.isBatchModalOpen.set(false);
    this.selectedProduct.set(null);
  }

  submitNewBatch(): void {
    const prod = this.selectedProduct();
    const activeWh = this.warehouseService.activeWarehouse();
    if (!prod || !activeWh) return;

    if (this.newBatchForm.invalid) {
      this.newBatchForm.markAllAsTouched();
      return;
    }

    const value = this.newBatchForm.value;
    this.batchService.createBatch({
      batchNumber: value.batchNumber,
      productId: prod.id,
      warehouseId: activeWh.id,
      expirationDate: value.expirationDate,
      manufacturingDate: value.manufacturingDate || null,
      initialQuantity: value.initialQuantity,
      unitCost: value.unitCost
    }).subscribe({
      next: () => {
        this.newBatchForm.reset({ initialQuantity: 10 });
        this.loadProducts();
      },
      error: (err) => alert(err.error?.message || 'Error al registrar lote')
    });
  }

  submitFefoDispatch(): void {
    const prod = this.selectedProduct();
    const activeWh = this.warehouseService.activeWarehouse();
    if (!prod || !activeWh) return;

    if (this.fefoDispatchForm.invalid) {
      this.fefoDispatchForm.markAllAsTouched();
      return;
    }

    this.isDispatchingFefo.set(true);
    this.fefoDispatchSuccess.set(null);

    const val = this.fefoDispatchForm.value;
    this.batchService.dispatchFefo({
      productId: prod.id,
      warehouseId: activeWh.id,
      quantity: val.quantity,
      referenceDocument: val.referenceDocument,
      notes: val.notes
    }).subscribe({
      next: (res) => {
        this.isDispatchingFefo.set(false);
        this.fefoDispatchSuccess.set(`¡Despacho FEFO exitoso! Se asignaron ${res.dispatchedQuantity} unidades.`);
        this.fefoAllocations.set(res.allocations);
        this.loadProducts();
      },
      error: (err) => {
        this.isDispatchingFefo.set(false);
        alert(err.error?.message || 'Error al despachar lote con FEFO');
      }
    });
  }

  // ==========================================
  // MODAL ACTIVOS SERIALIZADOS & PRÉSTAMOS
  // ==========================================
  openSerialModal(product: ProductResponse): void {
    this.selectedProduct.set(product);
    this.newSerialForm.reset();
    this.serialService.getSerialsByProduct(product.id).subscribe();
    this.isSerialModalOpen.set(true);
  }

  closeSerialModal(): void {
    this.isSerialModalOpen.set(false);
    this.selectedProduct.set(null);
  }

  submitNewSerial(): void {
    const prod = this.selectedProduct();
    const activeWh = this.warehouseService.activeWarehouse();
    if (!prod || !activeWh) return;

    if (this.newSerialForm.invalid) {
      this.newSerialForm.markAllAsTouched();
      return;
    }

    const value = this.newSerialForm.value;
    this.serialService.registerSerial({
      serialNumber: value.serialNumber,
      productId: prod.id,
      warehouseId: activeWh.id,
      notes: value.notes
    }).subscribe({
      next: () => {
        this.newSerialForm.reset();
      },
      error: (err) => alert(err.error?.message || 'Error al registrar activo')
    });
  }

  loanAsset(serial: ProductSerial): void {
    const name = prompt(`Ingrese el nombre del responsable para prestar el activo "${serial.serialNumber}":`);
    if (!name || name.trim() === '') return;

    this.serialService.updateStatus(serial.id, {
      newStatus: 'LOANED',
      assignedTo: name.trim()
    }).subscribe({
      error: (err) => alert(err.error?.message || 'Error al prestar activo')
    });
  }

  returnAsset(serial: ProductSerial): void {
    if (confirm(`¿Confirmar recepción del activo "${serial.serialNumber}" devuelto a bodega?`)) {
      this.serialService.updateStatus(serial.id, {
        newStatus: 'AVAILABLE'
      }).subscribe({
        error: (err) => alert(err.error?.message || 'Error al devolver activo')
      });
    }
  }

  setMaintenance(serial: ProductSerial): void {
    const notes = prompt(`Motivo de mantenimiento para el activo "${serial.serialNumber}":`);
    this.serialService.updateStatus(serial.id, {
      newStatus: 'IN_MAINTENANCE',
      notes: notes || 'Enviado a servicio técnico'
    }).subscribe({
      error: (err) => alert(err.error?.message || 'Error al actualizar estado')
    });
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

  getAssetStatusBadge(status: AssetStatus): string {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'LOANED':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'IN_MAINTENANCE':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'DECOMMISSIONED':
      default:
        return 'bg-slate-700 text-slate-400 border border-slate-600';
    }
  }

  getAssetStatusLabel(status: AssetStatus): string {
    switch (status) {
      case 'AVAILABLE':
        return 'Disponible';
      case 'LOANED':
        return 'Prestado';
      case 'IN_MAINTENANCE':
        return 'En Mantenimiento';
      case 'DECOMMISSIONED':
      default:
        return 'Dado de Baja';
    }
  }
}
