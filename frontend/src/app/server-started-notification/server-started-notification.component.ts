import { TranslateService, TranslateModule } from '@ngx-translate/core'
import { ChallengeService } from '../Services/challenge.service'
import { ChangeDetectorRef, Component, NgZone, type OnInit } from '@angular/core'
import { CookieService } from 'ngy-cookie'
import { SocketIoService } from '../Services/socket-io.service'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule, MatCardContent } from '@angular/material/card'
import { NgIf } from '@angular/common'

interface HackingProgress {
  autoRestoreMessage: string | null
  cleared: boolean
}

@Component({
  selector: 'app-server-started-notification',
  templateUrl: './server-started-notification.component.html',
  styleUrls: ['./server-started-notification.component.scss'],
  imports: [NgIf, MatCardModule, MatCardContent, TranslateModule, MatButtonModule, MatIconModule]
})
export class ServerStartedNotificationComponent implements OnInit {
  public hackingProgress: HackingProgress = {} as HackingProgress

  constructor (private readonly ngZone: NgZone, private readonly challengeService: ChallengeService, private readonly translate: TranslateService, private readonly cookieService: CookieService, private readonly ref: ChangeDetectorRef, private readonly io: SocketIoService) {
  }

  ngOnInit (): void {
    this.ngZone.runOutsideAngular(() => {
      this.io.socket().on('server started', this.handleServerStarted.bind(this))
    })
  }

  private handleServerStarted(): void {
    this.restoreProgressFromCookies()
    this.ref.detectChanges()
  }

  private restoreProgressFromCookies(): void {
    const continueCode = this.cookieService.get('continueCode')
    const continueCodeFindIt = this.cookieService.get('continueCodeFindIt')
    const continueCodeFixIt = this.cookieService.get('continueCodeFixIt')

    if (continueCode) {
      this.restoreProgress(continueCode, this.challengeService.restoreProgress, 'AUTO_RESTORED_PROGRESS', 'AUTO_RESTORE_PROGRESS_FAILED')
    }
    if (continueCodeFindIt) {
      this.restoreProgress(continueCodeFindIt, this.challengeService.restoreProgressFindIt, null, null)
    }
    if (continueCodeFixIt) {
      this.restoreProgress(continueCodeFixIt, this.challengeService.restoreProgressFixIt, null, null)
    }
  }

  private restoreProgress(code: string, restoreMethod: (code: string) => any, successMessageKey: string | null, errorMessageKey: string | null): void {
    restoreMethod(encodeURIComponent(code)).subscribe(() => {
      if (successMessageKey) {
        this.translate.get(successMessageKey).subscribe((notification) => {
          this.hackingProgress.autoRestoreMessage = notification
        }, (translationId) => {
          this.hackingProgress.autoRestoreMessage = translationId
        })
      }
    }, (error) => {
      console.log(error)
      if (errorMessageKey) {
        this.translate.get(errorMessageKey, { error }).subscribe((notification) => {
          this.hackingProgress.autoRestoreMessage = notification
        }, (translationId) => {
          this.hackingProgress.autoRestoreMessage = translationId
        })
      }
    })
  }

  closeNotification () {
    this.hackingProgress.autoRestoreMessage = null
  }

  clearProgress () {
    this.cookieService.remove('continueCode')
    this.cookieService.remove('continueCodeFixIt')
    this.cookieService.remove('continueCodeFindIt')
    this.cookieService.remove('token')
    sessionStorage.removeItem('bid')
    sessionStorage.removeItem('itemTotal')
    localStorage.removeItem('token')
    localStorage.removeItem('displayedDifficulties')
    localStorage.removeItem('showSolvedChallenges')
    localStorage.removeItem('showDisabledChallenges')
    localStorage.removeItem('showOnlyTutorialChallenges')
    localStorage.removeItem('displayedChallengeCategories')
    this.hackingProgress.cleared = true
  }
}