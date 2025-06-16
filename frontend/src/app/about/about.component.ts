/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { Component, type OnInit } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { ConfigurationService } from '../Services/configuration.service'
import { FeedbackService } from '../Services/feedback.service'
import { Gallery, type GalleryRef, GalleryComponent, GalleryImageDef } from 'ng-gallery'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faFacebook, faMastodon, faReddit, faSlack, faTwitter } from '@fortawesome/free-brands-svg-icons'
import { faNewspaper, faStar } from '@fortawesome/free-regular-svg-icons'
import { faStar as fasStar, faPalette, faBold } from '@fortawesome/free-solid-svg-icons'
import { catchError } from 'rxjs/operators'
import { EMPTY } from 'rxjs'
import { MatButtonModule } from '@angular/material/button'
import { NgIf } from '@angular/common'
import { TranslateModule } from '@ngx-translate/core'
import { MatCardModule } from '@angular/material/card'
import { FlexModule } from '@angular/flex-layout/flex'

library.add(faFacebook, faTwitter, faSlack, faReddit, faNewspaper, faStar, fasStar, faPalette, faMastodon, faBold)

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  imports: [FlexModule, MatCardModule, TranslateModule, GalleryComponent, GalleryImageDef, NgIf, MatButtonModule]
})
export class AboutComponent implements OnInit {
  public blueSkyUrl?: string
  public mastodonUrl?: string
  public twitterUrl?: string
  public facebookUrl?: string
  public slackUrl?: string
  public redditUrl?: string
  public pressKitUrl?: string
  public nftUrl?: string
  public galleryRef: GalleryRef

  private readonly images = [
    'assets/public/images/carousel/1.jpg',
    'assets/public/images/carousel/2.jpg',
    'assets/public/images/carousel/3.jpg',
    'assets/public/images/carousel/4.jpg',
    'assets/public/images/carousel/5.png',
    'assets/public/images/carousel/6.jpg',
    'assets/public/images/carousel/7.jpg'
  ]

  private readonly stars = [
    null,
    '<i class="fas fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i>',
    '<i class="fas fa-star"></i><i class="fas fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i>',
    '<i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i>',
    '<i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="far fa-star"></i>',
    '<i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>'
  ]

  constructor (
    private readonly configurationService: ConfigurationService,
    private readonly feedbackService: FeedbackService,
    private readonly sanitizer: DomSanitizer,
    private readonly gallery: Gallery
  ) {}

  ngOnInit (): void {
    this.galleryRef = this.gallery.ref('feedback-gallery')
    this.populateSlideshowFromFeedbacks()
    this.configurationService.getApplicationConfiguration()
      .pipe(
        catchError((err) => {
          console.error(err)
          return EMPTY
        })
      ).subscribe((config) => {
        if (config?.application?.social) {
          this.setSocialUrls(config.application.social);
        }
      })
  }

  private setSocialUrls(social: any): void {
    if (social.blueSkyUrl) this.blueSkyUrl = social.blueSkyUrl;
    if (social.mastodonUrl) this.mastodonUrl = social.mastodonUrl;
    if (social.twitterUrl) this.twitterUrl = social.twitterUrl;
    if (social.facebookUrl) this.facebookUrl = social.facebookUrl;
    if (social.slackUrl) this.slackUrl = social.slackUrl;
    if (social.redditUrl) this.redditUrl = social.redditUrl;
    if (social.pressKitUrl) this.pressKitUrl = social.pressKitUrl;
    if (social.nftUrl) this.nftUrl = social.nftUrl;
  }

  populateSlideshowFromFeedbacks () {
    this.feedbackService
      .find()
      .pipe(
        catchError((err) => {
          console.error(err)
          return EMPTY
        })
      )
      .subscribe((feedbacks) => {
        for (let i = 0; i < feedbacks.length; i++) {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          feedbacks[i].comment = `<span style="width: 90%; display:block;">${
            feedbacks[i].comment
          }<br/> (${this.stars[feedbacks[i].rating]})</span>`
          feedbacks[i].comment = this.sanitizer.bypassSecurityTrustHtml(
            feedbacks[i].comment
          )

          this.galleryRef.addImage({
            src: this.images[i % this.images.length],
            args: feedbacks[i].comment
          })
        }
      })
  }
}