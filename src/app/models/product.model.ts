// Espejo de ProductResponseDTO de Java
export interface ProductResponse {
  id: number;
  barcode: string;
  name: string;
  description: string;
  purchasePrice: number;
  salePrice: number;
  currentStock: number;
  minStock: number;
  active: boolean;
  requiresRestock: boolean;
  categoryId: number;
  categoryName: string;
  createdAt: string;
}

// Espejo de ProductRequestDTO de Java
export interface ProductRequest {
  barcode: string;
  name: string;
  description?: string;
  purchasePrice?: number;
  salePrice: number;
  currentStock: number;
  minStock: number;
  categoryId: number;
}