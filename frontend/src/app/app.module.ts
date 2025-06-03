import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'
import { HttpClientModule, HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http'
import { OverlayContainer } from '@angular/cdk/overlay'
import { TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { TranslateHttpLoader } from '@ngx-translate/http-loader'
import { BrowserModule } from '@angular/platform-browser'
import { ReactiveFormsModule } from '@angular/forms'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { CookieModule } from 'ngx-cookie'
import { MatPasswordStrengthModule } from 'angular-password-strength-meter'
import { FlexLayoutModule } from '@angular/flex-layout'
import { GalleryModule } from '@ngx-gallery/core'
import { NgxTextDiffModule } from 'ngx-text-diff'
import { QrCodeModule } from 'ng-qrcode'
import { FileUploadModule } from 'ng2-file-upload'
import { ClipboardModule } from 'ngx-clipboard'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatIconModule } from '@angular/material/icon'
import { FormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatRippleModule } from '@angular/material/core'
import { MatTableModule } from '@angular/material/table'
import { MatPaginatorModule } from '@angular/material/paginator'
import { MatCardModule } from '@angular/material/card'
import { MatInputModule } from '@angular/material/input'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatDialogModule } from '@angular/material/dialog'
import { MatDividerModule } from '@angular/material/divider'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatNativeDateModule } from '@angular/material/core'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatMenuModule } from '@angular/material/menu'
import { MatListModule } from '@angular/material/list'
import { MatButtonToggleModule } from '@angular/material/button-toggle'
import { LayoutModule } from '@angular/cdk/layout'
import { MatGridListModule } from '@angular/material/grid-list'
import { MatBadgeModule } from '@angular/material/badge'
import { MatRadioModule } from '@angular/material/radio'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { MatSliderModule } from '@angular/material/slider'
import { MatTabsModule } from '@angular/material/tabs'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatChipsModule } from '@angular/material/chips'
import { MatAutocompleteModule } from '@angular/material/autocomplete'
import { HighlightModule, HIGHLIGHT_OPTIONS } from 'ngx-highlightjs'
import { AppComponent } from './app.component'
import { ProductService } from './Services/product.service'
import { ConfigurationService } from './Services/configuration.service'
import { AdministrationService } from './Services/administration.service'
import { SecurityQuestionService } from './Services/security-question.service'
import { DataSubjectService } from './Services/data-subject.service'
import { UserService } from './Services/user.service'
import { SecurityAnswerService } from './Services/security-answer.service'
import { CaptchaService } from './Services/captcha.service'
import { FeedbackService } from './Services/feedback.service'
import { WindowRefService } from './Services/window-ref.service'
import { ProductReviewService } from './Services/product-review.service'
import { ComplaintService } from './Services/complaint.service'
import { ChatbotService } from './Services/chatbot.service'
import { TrackOrderService } from './Services/track-order.service'
import { RecycleService } from './Services/recycle.service'
import { BasketService } from './Services/basket.service'
import { ChallengeService } from './Services/challenge.service'
import { CookieService } from 'ngx-cookie-service'
import { AdminGuard } from './Guards/admin.guard'
import { LoginGuard } from './Guards/login.guard'
import { PaymentService } from './Services/payment.service'
import { AccountingGuard } from './Guards/accounting.guard'
import { DeluxeGuard } from './Guards/deluxe.guard'
import { ImageCaptchaService } from './Services/image-captcha.service'
import { KeysService } from './Services/keys.service'
import { AddressService } from './Services/address.service'
import { QuantityService } from './Services/quantity.service'
import { WalletService } from './Services/wallet.service'
import { OrderHistoryService } from './Services/order-history.service'
import { DeliveryService } from './Services/delivery.service'
import { PhotoWallService } from './Services/photo-wall.service'
import { RequestInterceptor } from './interceptors/request.interceptor'
import { AppRoutingModule } from './app-routing.module'

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json')
}

@NgModule({
  declarations: [
    AppComponent,
    // Add other components here
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    CookieModule.forRoot(),
    MatPasswordStrengthModule.forRoot(),
    FlexLayoutModule,
    GalleryModule,
    NgxTextDiffModule,
    QrCodeModule,
    FileUploadModule,
    ClipboardModule,
    MatToolbarModule,
    MatIconModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatSidenavModule,
    MatRippleModule,
    MatTableModule,
    MatPaginatorModule,
    MatCardModule,
    MatInputModule,
    MatCheckboxModule,
    MatDialogModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatExpansionModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatMenuModule,
    MatListModule,
    MatButtonToggleModule,
    LayoutModule,
    MatGridListModule,
    MatBadgeModule,
    MatRadioModule,
    MatSnackBarModule,
    MatSliderModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatAutocompleteModule,
    HighlightModule,
    // Add other modules here
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: RequestInterceptor,
      multi: true
    },
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: {
        coreLibraryLoader: async () => await import('highlight.js/lib/core'),
        lineNumbersLoader: async () => await import('highlightjs-line-numbers.js'),
        languages: {
          typescript: async () => await import('highlight.js/lib/languages/typescript'),
          javascript: async () => await import('highlight.js/lib/languages/javascript'),
          yaml: async () => await import('highlight.js/lib/languages/yaml')
        }
      }
    },
    ProductService,
    ConfigurationService,
    AdministrationService,
    SecurityQuestionService,
    DataSubjectService,
    UserService,
    SecurityAnswerService,
    CaptchaService,
    FeedbackService,
    WindowRefService,
    ProductReviewService,
    ComplaintService,
    ChatbotService,
    TrackOrderService,
    RecycleService,
    BasketService,
    ChallengeService,
    CookieService,
    AdminGuard,
    LoginGuard,
    PaymentService,
    AccountingGuard,
    DeluxeGuard,
    ImageCaptchaService,
    KeysService,
    AddressService,
    QuantityService,
    WalletService,
    OrderHistoryService,
    DeliveryService,
    PhotoWallService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(public configurationService: ConfigurationService, public overlayContainer: OverlayContainer) {
    configurationService.getApplicationConfiguration().subscribe((conf) => {
      overlayContainer.getContainerElement().classList.add(conf.application.theme + '-theme')
    })
  }
}