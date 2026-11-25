import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

interface MenuItem {
  item_id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  status: 'available' | 'unavailable';
  image_url?: string;
  rating?: number;
  reviews_count?: number;
}

interface CartItem extends MenuItem {
  quantity: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  user: any = null;
  activeNav: string = 'menu';
  selectedCategory: string = 'All';
  availabilityFilter: string = 'all';
  searchQuery: string = '';
  currentDate: string = '';
  
  activeOrder: any = null;
  userPoints: number = 0;

  orderType: 'pick-up' | 'dine-in' = 'pick-up';
  pickupTime: string = '';
  orderMessage: string = '';
  isOrderSuccess: boolean = false;

  categories: string[] = ['All', 'Rice meals', 'Noodles', 'Sides', 'Drinks', 'Desserts', 'Snacks', 'Chicken Wings'];
  
  menuItems: MenuItem[] = [];
  cart: CartItem[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setCurrentDate();

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.user = JSON.parse(storedUser);
      this.userPoints = this.user.points || 0;
    }
    this.loadMenu();
  }

  setCurrentDate(): void {
    const today = new Date();
    this.currentDate = today.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  loadMenu(): void {
    this.http.get<MenuItem[]>('http://localhost:3000/api/menu').subscribe({
      next: (data) => {
        this.menuItems = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load menu items:', err);
      }
    });
  }

  filteredMenuItems(): MenuItem[] {
    return this.menuItems.filter(item => {
      const matchesCategory = this.selectedCategory === 'All' || item.category.toLowerCase() === this.selectedCategory.toLowerCase();
      const matchesSearch = item.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                            item.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesAvailability = this.availabilityFilter === 'all' || item.status === 'available';
      
      return matchesCategory && matchesSearch && matchesAvailability;
    });
  }

  addToCart(item: MenuItem): void {
    if (item.status === 'unavailable') return;
    const existing = this.cart.find(c => c.item_id === item.item_id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({ ...item, quantity: 1 });
    }
  }

  removeFromCart(itemId: number): void {
    const index = this.cart.findIndex(c => c.item_id === itemId);
    if (index > -1) {
      if (this.cart[index].quantity > 1) {
        this.cart[index].quantity -= 1;
      } else {
        this.cart.splice(index, 1);
      }
    }
  }

  getTotalAmount(): number {
    return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  getTotalItemsCount(): number {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  placeAdvanceOrder(): void {
    if (this.cart.length === 0) return;

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const currentDateISO = new Date().toISOString().slice(0, 10);
    const total = this.getTotalAmount();
    const formattedTime = this.pickupTime ? `${this.pickupTime}:00` : '12:00:00';
    
    const orderPayload = {
      userId: this.user?.user_id || this.user?.id,
      orderType: this.orderType,
      scheduleDate: currentDateISO,
      scheduleTime: formattedTime,
      items: this.cart.map(item => ({
        item_id: item.item_id,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: total
    };

    this.http.post<any>('http://localhost:3000/api/orders', orderPayload, { headers }).subscribe({
      next: (res) => {
        this.isOrderSuccess = true;
        this.orderMessage = `Advance order #${res.orderId} placed successfully!`;
        
      
        this.activeOrder = {
          id: res.orderId,
          time: this.pickupTime || '12:00 PM',
          type: this.orderType === 'pick-up' ? 'Pickup' : 'Dine-in',
          total: total,
          status: 'Pending'
        };

        this.cart = [];
        this.pickupTime = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isOrderSuccess = false;
        this.orderMessage = err.error?.message || 'Could not place order.';
        this.cdr.detectChanges();
      }
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}