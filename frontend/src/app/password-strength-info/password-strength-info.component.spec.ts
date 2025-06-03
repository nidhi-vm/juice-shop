import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { PasswordStrengthInfoComponent } from './password-strength-info.component'

describe('PasswordStrengthInfoComponent', () => {
  let component: PasswordStrengthInfoComponent
  let fixture: ComponentFixture<PasswordStrengthInfoComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PasswordStrengthInfoComponent]
    })
      .compileComponents()

    fixture = TestBed.createComponent(PasswordStrengthInfoComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should return "Too short" for password length less than 6', () => {
    component.passwordLength = 5;
    expect(component.getPasswordStrengthMessage()).toEqual('Too short');
  });

  it('should return "Weak" for password length between 6 and 10', () => {
    component.passwordLength = 8;
    expect(component.getPasswordStrengthMessage()).toEqual('Weak');
  });

  it('should return "Moderate" for password length between 11 and 14', () => {
    component.passwordLength = 12;
    expect(component.getPasswordStrengthMessage()).toEqual('Moderate');
  });

  it('should return "Strong" for password length greater than 14', () => {
    component.passwordLength = 15;
    expect(component.getPasswordStrengthMessage()).toEqual('Strong');
  });
})