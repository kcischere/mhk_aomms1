import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  message = '';
  isSuccess = false;

  constructor(private http: HttpClient, private router: Router) {}

  onRegister() {
    this.message = '';

    const payload = {
      name: this.name,
      email: this.email,
      password: this.password
    };

    this.http.post<any>('http://localhost:3000/api/auth/register', payload).subscribe({
      next: (res) => {
        this.isSuccess = true;
        this.message = 'Registration successful! Redirecting to login...';
        
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (err) => {
        this.isSuccess = false;
        this.message = err.error.message || 'Registration failed';
      }
    });
  }
}