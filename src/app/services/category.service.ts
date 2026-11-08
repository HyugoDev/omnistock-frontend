import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { CategoryResponse, CategoryRequest } from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/v1/categories`;

  public categories = signal<CategoryResponse[]>([]);

  getAllCategories(): Observable<CategoryResponse[]> {
    return this.http.get<CategoryResponse[]>(this.endpoint).pipe(
      tap((data) => this.categories.set(data))
    );
  }

  createCategory(category: CategoryRequest): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>(this.endpoint, category).pipe(
      tap((newCat) => this.categories.update(list => [...list, newCat]))
    );
  }
}
