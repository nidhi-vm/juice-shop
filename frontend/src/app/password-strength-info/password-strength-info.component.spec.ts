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

  it('should return correct password length message for short password', () => {
    component.password = '123';
    expect(component.getPasswordLengthMessage()).toBe('Password is too short');
  });

  it('should return correct password length message for medium password', () => {
    component.password = '123456';
    expect(component.getPasswordLengthMessage()).toBe('Password length is acceptable');
  });

  it('should return correct password length message for long password', () => {
    component.password = '1234567890';
    expect(component.getPasswordLengthMessage()).toBe('Password is strong');
  });
})