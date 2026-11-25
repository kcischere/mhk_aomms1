import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  email = '';
  password = '';
  message = '';
  isSuccess = false;


  constructor(
    private http: HttpClient, 
    private router: Router,
    private cdr: ChangeDetectorRef 
  ) {}

  onLogin() {
    this.message = '';
    
    const payload = {
      email: this.email,
      password: this.password
    };

    this.http.post<any>('https://mhk-aomms1.onrender.com/api/auth/login', payload).subscribe({
      next: (res) => {
        this.isSuccess = true;
        this.message = 'Login successful!';
        this.cdr.detectChanges(); 

        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));

        setTimeout(() => {
          if (res.user.role === 'admin') {
            this.router.navigate(['/admin-dashboard']);
          } else if (res.user.role === 'cashier') {
            this.router.navigate(['/cashier-counter']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        }, 500);
      },
      error: (err) => {
        this.isSuccess = false;
        this.message = err.error?.message || 'Incorrect email or password. Please try again.';
        this.cdr.detectChanges(); 
      }
    });
  }
}