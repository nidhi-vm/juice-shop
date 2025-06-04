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

  it('should return weak message for password length less than 6', () => {
    component.passwordLength = 5;
    expect(component.getPasswordStrengthMessage()).toEqual('Weak');
  });

  it('should return medium message for password length between 6 and 10', () => {
    component.passwordLength = 8;
    expect(component.getPasswordStrengthMessage()).toEqual('Medium');
  });

  it('should return strong message for password length greater than 10', () => {
    component.passwordLength = 12;
    expect(component.getPasswordStrengthMessage()).toEqual('Strong');
  });
})