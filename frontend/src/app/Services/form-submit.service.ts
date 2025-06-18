/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { Inject, Injectable } from '@angular/core'
import { DOCUMENT } from '@angular/common'

@Injectable({
  providedIn: 'root'
})
export class FormSubmitService {
  constructor (@Inject(DOCUMENT) private readonly _document: Document) { } // Changed HTMLDocument to Document

  attachEnterKeyHandler (formId: string, submitButtonId: string, onSubmit: any) {
    const form = this._document.getElementById(formId) as HTMLFormElement
    const submitButton = this._document.getElementById(submitButtonId) as HTMLInputElement

    form.addEventListener('keyup', function (event) {
      event.preventDefault()
      if (event instanceof KeyboardEvent && event.key === 'Enter' && !submitButton.disabled) { // Changed keyCode to key
        onSubmit()
      }
    })
  }
}