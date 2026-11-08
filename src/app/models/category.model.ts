// Espejo de CategoryResponseDTO de Java
export interface CategoryResponse {
  id: number;
  name: string;
  description: string;
}

// Espejo de CategoryRequestDTO de Java
export interface CategoryRequest {
  name: string;
  description?: string;
}