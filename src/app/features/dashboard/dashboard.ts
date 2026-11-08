import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, NgClass, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  protected readonly productService = inject(ProductService);

  ngOnInit(): void {
    if (this.productService.products().length === 0) {
      this.productService.getAllProducts().subscribe();
    }
  }
}
