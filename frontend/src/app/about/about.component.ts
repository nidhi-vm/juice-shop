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
        this.setSocialUrls(config?.application?.social)
      })
  }

  private setSocialUrls(socialConfig: any): void {
    if (socialConfig) {
      this.blueSkyUrl = socialConfig.blueSkyUrl
      this.mastodonUrl = socialConfig.mastodonUrl
      this.twitterUrl = socialConfig.twitterUrl
      this.facebookUrl = socialConfig.facebookUrl
      this.slackUrl = socialConfig.slackUrl
      this.redditUrl = socialConfig.redditUrl
      this.pressKitUrl = socialConfig.pressKitUrl
      this.nftUrl = socialConfig.nftUrl
    }
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
        feedbacks.forEach((feedback, index) => {
          feedback.comment = this.formatFeedbackComment(feedback)
          this.galleryRef.addImage({
            src: this.images[index % this.images.length],
            args: feedback.comment
          })
        })
      })
  }

  private formatFeedbackComment(feedback: any): any {
    const comment = `<span style="width: 90%; display:block;">${feedback.comment}<br/> (${this.stars[feedback.rating]})</span>`
    return this.sanitizer.bypassSecurityTrustHtml(comment)
  }
}