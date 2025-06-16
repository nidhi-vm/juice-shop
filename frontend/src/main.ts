/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { enableProdMode, importProvidersFrom } from '@angular/core'
import { AppComponent } from './app/app.component';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { environment } from './environments/environment'
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { CookieModule } from 'ngy-cookie';
import { Routing } from './app/app.routing';
import { HIGHLIGHT_OPTIONS, HighlightModule } from 'ngx-highlightjs';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { RequestInterceptor } from './app/Services/request.interceptor';

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
        }), CookieModule.forRoot(), FlexLayoutModule, ReactiveFormsModule, HighlightModule),
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
        }
    ]
})
  .catch((err: Error) => console.log(err))