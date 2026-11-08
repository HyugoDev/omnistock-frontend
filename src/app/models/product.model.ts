export type ProductType = 'STANDARD' | 'BATCH_EXPIRABLE' | 'SERIALIZED_ASSET';
export type UnitOfMeasure = 'UNIT' | 'KILOGRAM' | 'GRAM' | 'LITER' | 'METER' | 'BOX';
export type AssetStatus = 'AVAILABLE' | 'LOANED' | 'IN_MAINTENANCE' | 'DECOMMISSIONED';

// Espejo de ProductResponseDTO de Java Spring Boot
export interface ProductResponse {
  id: number;
  barcode: string;
  sku?: string | null;
  name: string;
  description?: string | null;
  productType: ProductType;
  unitOfMeasure: UnitOfMeasure;
  purchasePrice?: number | null;
  salePrice: number;
  currentStock: number;
  minStock: number;
  attributesJson?: string | null;
  active: boolean;
  requiresRestock: boolean;
  categoryId: number;
  categoryName: string;
  createdAt: string;
}

// Espejo de ProductRequestDTO de Java Spring Boot
export interface ProductRequest {
  barcode: string;
  sku?: string | null;
  name: string;
  description?: string | null;
  productType?: ProductType;
  unitOfMeasure?: UnitOfMeasure;
  purchasePrice?: number | null;
  salePrice: number;
  currentStock: number;
  minStock: number;
  attributesJson?: string | null;
  categoryId: number;
}

// Modelos para Almacenes y Trazabilidad Universal
export interface Warehouse {
  id: number;
  code: string;
  name: string;
  address?: string | null;
  active: boolean;
  isTransit: boolean;
}

export interface ProductBatch {
  id: number;
  batchNumber: string;
  productId: number;
  warehouseId: number;
  manufacturingDate?: string | null;
  expirationDate: string;
  initialQuantity: number;
  currentQuantity: number;
  unitCost?: number | null;
  active: boolean;
  isExpired?: boolean;
  isNearExpiration?: boolean;
}

export interface ProductSerial {
  id: number;
  serialNumber: string;
  productId: number;
  warehouseId: number;
  status: AssetStatus;
  assignedTo?: string | null;
  assignedAt?: string | null;
  notes?: string | null;
}
