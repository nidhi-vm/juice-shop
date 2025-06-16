export class AppComponent {
  constructor (@Inject(DOCUMENT) private readonly _document: Document, private readonly translate: TranslateService) {
    this.translate.setDefaultLang('en')
  }
}