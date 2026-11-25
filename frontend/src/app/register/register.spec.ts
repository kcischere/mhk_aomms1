import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register'; // <-- Update class name here

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent], // <-- Update here
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent); // <-- Update here
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});