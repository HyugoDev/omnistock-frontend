import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  protected readonly productService = inject(ProductService);

  ngOnInit(): void {
    // Si no se han cargado productos aún, los solicitamos
    if (this.productService.products().length === 0) {
      this.productService.getAllProducts().subscribe();
    }
  }
}
