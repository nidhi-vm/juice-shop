/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { enableProdMode, importProvidersFrom } from '@angular/core'
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser'
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment'
import { provideAnimations } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { CookieModule, CookieService } from 'ngy-cookie';
import { FlexLayoutModule } from '@angular/flex-layout';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { HttpLoaderFactory } from './app/app.module';
import { Routing } from './app/app.routing';
import { GalleryModule } from 'ng-gallery';
import { NgxTextDiffModule } from '@winarg/ngx-text-diff';
import { QrCodeModule } from 'ng-qrcode';
import { FileUploadModule } from 'ng2-file-upload';
import { ClipboardModule } from 'ngx-clipboard';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatRippleModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LayoutModule } from '@angular/cdk/layout';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSliderModule } from '@angular/material/slider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { HIGHLIGHT_OPTIONS, HighlightModule } from 'ngx-highlightjs';
import { HTTP_INTERCEPTORS, HttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { RequestInterceptor } from './app/Services/request.interceptor';
import { PhotoWallService } from './app/Services/photo-wall.service';
import { DeliveryService } from './app/Services/delivery.service';
import { OrderHistoryService } from './app/Services/order-history.service';
import { WalletService } from './app/Services/wallet.service';
import { QuantityService } from './app/Services/quantity.service';
import { AddressService } from './app/Services/address.service';
import { KeysService } from './app/Services/keys.service';
import { ImageCaptchaService } from './app/Services/image-captcha.service';
import { PaymentService } from './app/Services/payment.service';
import { AdminGuard, LoginGuard, AccountingGuard, DeluxeGuard } from './app/app.guard';
import { ChallengeService } from './app/Services/challenge.service';
import { BasketService } from './app/Services/basket.service';
import { RecycleService } from './app/Services/recycle.service';
import { TrackOrderService } from './app/Services/track-order.service';
import { ChatbotService } from './app/Services/chatbot.service';
import { ComplaintService } from './app/Services/complaint.service';
import { ProductReviewService } from './app/Services/product-review.service';
import { WindowRefService } from './app/Services/window-ref.service';
import { FeedbackService } from './app/Services/feedback.service';
import { CaptchaService } from './app/Services/captcha.service';
import { SecurityAnswerService } from './app/Services/security-answer.service';
import { UserService } from './app/Services/user.service';
import { DataSubjectService } from './app/Services/data-subject.service';
import { SecurityQuestionService } from './app/Services/security-question.service';
import { AdministrationService } from './app/Services/administration.service';
import { ConfigurationService } from './app/Services/configuration.service';
import { ProductService } from './app/Services/product.service';

if (environment.production) {
  enableProdMode()
}

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(BrowserModule, Routing, TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient]
            }
        }), CookieModule.forRoot(), FlexLayoutModule, ReactiveFormsModule, GalleryModule, NgxTextDiffModule, QrCodeModule, FileUploadModule, ClipboardModule, MatToolbarModule, MatIconModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatSidenavModule, MatRippleModule, MatTableModule, MatPaginatorModule, MatCardModule, MatInputModule, MatCheckboxModule, MatDialogModule, MatDividerModule, MatDatepickerModule, MatNativeDateModule, MatExpansionModule, MatProgressBarModule, MatTooltipModule, MatMenuModule, MatListModule, MatButtonToggleModule, LayoutModule, MatGridListModule, MatBadgeModule, MatRadioModule, MatSnackBarModule, MatSliderModule, MatTabsModule, MatSlideToggleModule, HighlightModule),
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
        PhotoWallService,
        provideHttpClient(withInterceptorsFromDi()),
        provideAnimations()
    ]
})
  .catch((err: Error) => console.log(err))