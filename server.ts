import i18n from 'i18n'
import cors from 'cors'
import fs from 'node:fs'
import yaml from 'js-yaml'
import config from 'config'
import morgan from 'morgan'
import multer from 'multer'
import helmet from 'helmet'
import http from 'node:http'
import path from 'node:path'
import express from 'express'
import colors from 'colors/safe'
import serveIndex from 'serve-index'
import bodyParser from 'body-parser'
import * as finale from 'finale-rest'
import compression from 'compression'
import robots from 'express-robots-txt'
import cookieParser from 'cookie-parser'
import * as Prometheus from 'prom-client'
import swaggerUi from 'swagger-ui-express'
import featurePolicy from 'feature-policy'
import { IpFilter } from 'express-ipfilter'
import securityTxt from 'express-security.txt'
import { rateLimit } from 'express-rate-limit'
import { getStream } from 'file-stream-rotator'
import type { Request, Response, NextFunction } from 'express'

import { sequelize } from './models'
import { UserModel } from './models/user'
import { CardModel } from './models/card'
import { WalletModel } from './models/wallet'
import { ProductModel } from './models/product'
import { RecycleModel } from './models/recycle'
import { AddressModel } from './models/address'
import { QuantityModel } from './models/quantity'
import { FeedbackModel } from './models/feedback'
import { ComplaintModel } from './models/complaint'
import { ChallengeModel } from './models/challenge'
import { BasketItemModel } from './models/basketitem'
import { SecurityAnswerModel } from './models/securityAnswer'
import { PrivacyRequestModel } from './models/privacyRequests'
import { SecurityQuestionModel } from './models/securityQuestion'

import logger from './lib/logger'
import * as utils from './lib/utils'
import * as antiCheat from './lib/antiCheat'
import * as security from './lib/insecurity'
import validateConfig from './lib/startup/validateConfig'
import cleanupFtpFolder from './lib/startup/cleanupFtpFolder'
import customizeEasterEgg from './lib/startup/customizeEasterEgg'
import customizeApplication from './lib/startup/customizeApplication'
import validatePreconditions from './lib/startup/validatePreconditions'
import registerWebsocketEvents from './lib/startup/registerWebsocketEvents'
import restoreOverwrittenFilesWithOriginals from './lib/startup/restoreOverwrittenFilesWithOriginals'

import datacreator from './data/datacreator'
import locales from './data/static/locales.json'

import { login } from './routes/login'
import * as verify from './routes/verify'
import * as address from './routes/address'
import * as chatbot from './routes/chatbot'
import * as metrics from './routes/metrics'
import * as payment from './routes/payment'
import { placeOrder } from './routes/order'
import { b2bOrder } from './routes/b2bOrder'
import * as delivery from './routes/delivery'
import * as recycles from './routes/recycles'
import * as twoFactorAuth from './routes/2fa'
import { applyCoupon } from './routes/coupon'
import dataErasure from './routes/dataErasure'
import { dataExport } from './routes/dataExport'
import { retrieveBasket } from './routes/basket'
import { searchProducts } from './routes/search'
import { trackOrder } from './routes/trackOrder'
import { saveLoginIp } from './routes/saveLoginIp'
import { serveKeyFiles } from './routes/keyServer'
import * as basketItems from './routes/basketItems'
import { performRedirect } from './routes/redirect'
import { serveEasterEgg } from './routes/easterEgg'
import { getLanguageList } from './routes/languages'
import { getUserProfile } from './routes/userProfile'
import { serveAngularClient } from './routes/angular'
import { resetPassword } from './routes/resetPassword'
import { serveLogFiles } from './routes/logfileServer'
import { servePublicFiles } from './routes/fileServer'
import { addMemory, getMemories } from './routes/memory'
import { changePassword } from './routes/changePassword'
import { countryMapping } from './routes/countryMapping'
import { retrieveAppVersion } from './routes/appVersion'
import { captchas, verifyCaptcha } from './routes/captcha'
import * as restoreProgress from './routes/restoreProgress'
import { checkKeys, nftUnlocked } from './routes/checkKeys'
import { retrieveLoggedInUser } from './routes/currentUser'
import authenticatedUsers from './routes/authenticatedUsers'
import { securityQuestion } from './routes/securityQuestion'
import { servePremiumContent } from './routes/premiumReward'
import { contractExploitListener } from './routes/web3Wallet'
import { updateUserProfile } from './routes/updateUserProfile'
import { getVideo, promotionVideo } from './routes/videoHandler'
import { likeProductReviews } from './routes/likeProductReviews'
import { repeatNotification } from './routes/repeatNotification'
import { serveQuarantineFiles } from './routes/quarantineServer'
import { showProductReviews } from './routes/showProductReviews'
import { nftMintListener, walletNFTVerify } from './routes/nftMint'
import { createProductReviews } from './routes/createProductReviews'
import { getWalletBalance, addWalletBalance } from './routes/wallet'
import { retrieveAppConfiguration } from './routes/appConfiguration'
import { updateProductReviews } from './routes/updateProductReviews'
import { servePrivacyPolicyProof } from './routes/privacyPolicyProof'
import { profileImageUrlUpload } from './routes/profileImageUrlUpload'
import { profileImageFileUpload } from './routes/profileImageFileUpload'
import { serveCodeFixes, checkCorrectFix } from './routes/vulnCodeFixes'
import { imageCaptchas, verifyImageCaptcha } from './routes/imageCaptcha'
import { upgradeToDeluxe, deluxeMembershipStatus } from './routes/deluxe'
import { orderHistory, allOrders, toggleDeliveryStatus } from './routes/orderHistory'
import { continueCode, continueCodeFindIt, continueCodeFixIt } from './routes/continueCode'
import { serveChallengesWithCodeSnippet, serveCodeSnippet, checkVulnLines } from './routes/vulnCodeSnippet'
import { ensureFileIsPassed, handleZipFileUpload, checkUploadSize, checkFileType, handleXmlUpload, handleYamlUpload } from './routes/fileUpload'

const app = express()
const server = new http.Server(app)

const errorhandler = require('errorhandler')

const startTime = Date.now()

const swaggerDocument = yaml.load(fs.readFileSync('./swagger.yml', 'utf8'))

const appName = config.get<string>('application.customMetricsPrefix')
const startupGauge = new Prometheus.Gauge({
  name: `${appName}_startup_duration_seconds`,
  help: `Duration ${appName} required to perform a certain task during startup`,
  labelNames: ['task']
})

const collectDurationPromise = (name: string, func: (...args: any) => Promise<any>) => {
  return async (...args: any) => {
    const end = startupGauge.startTimer({ task: name })
    try {
      const res = await func(...args)
      end()
      return res
    } catch (err) {
      console.error('Error in timed startup function: ' + name, err)
      throw err
    }
  }
}

app.set('view engine', 'hbs')

void collectDurationPromise('validatePreconditions', validatePreconditions)()
void collectDurationPromise('cleanupFtpFolder', cleanupFtpFolder)()
void collectDurationPromise('validateConfig', validateConfig)({})

restoreOverwrittenFilesWithOriginals().then(() => {
  app.locals.captchaId = 0
  app.locals.captchaReqId = 1
  app.locals.captchaBypassReqTimes = []
  app.locals.abused_ssti_bug = false
  app.locals.abused_ssrf_bug = false

  app.use(compression())

  app.options('*', cors())
  app.use(cors())

  app.use(helmet.noSniff())
  app.use(helmet.frameguard())
  app.disable('x-powered-by')
  app.use(featurePolicy({
    features: {
      payment: ["'self'"]
    }
  }))

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.append('X-Recruiting', config.get('application.securityTxt.hiring'))
    next()
  })

  app.use((req: Request, res: Response, next: NextFunction) => {
    req.url = req.url.replace(/[/]+/g, '/')
    next()
  })

  app.use(metrics.observeRequestMetricsMiddleware())

  const securityTxtExpiration = new Date()
  securityTxtExpiration.setFullYear(securityTxtExpiration.getFullYear() + 1)
  app.get(['/.well-known/security.txt', '/security.txt'], verify.accessControlChallenges())
  app.use(['/.well-known/security.txt', '/security.txt'], securityTxt({
    contact: config.get('application.securityTxt.contact'),
    encryption: config.get('application.securityTxt.encryption'),
    acknowledgements: config.get('application.securityTxt.acknowledgements'),
    'Preferred-Languages': [...new Set(locales.map((locale: { key: string }) => locale.key.substr(0, 2)))].join(', '),
    hiring: config.get('application.securityTxt.hiring'),
    csaf: config.get<string>('server.baseUrl') + config.get<string>('application.securityTxt.csaf'),
    expires: securityTxtExpiration.toUTCString()
  }))

  app.use(robots({ UserAgent: '*', Disallow: '/ftp' }))

  app.use(antiCheat.checkForPreSolveInteractions())

  app.use('/assets/public/images/padding', verify.accessControlChallenges())
  app.use('/assets/public/images/products', verify.accessControlChallenges())
  app.use('/assets/public/images/uploads', verify.accessControlChallenges())
  app.use('/assets/i18n', verify.accessControlChallenges())

  app.use('/solve/challenges/server-side', verify.serverSideChallenges())

  const serveIndexMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const origEnd = res.end
    res.end = function () {
      if (arguments.length) {
        const reqPath = req.originalUrl.replace(/\?.*$/, '')
        const currentFolder = reqPath.split('/').pop() as string
        arguments[0] = arguments[0].replace(/a href="([^"]+?)"/gi, function (matchString: string, matchedUrl: string) {
          let relativePath = path.relative(reqPath, matchedUrl)
          if (relativePath === '') {
            relativePath = currentFolder
          } else if (!relativePath.startsWith('.') && currentFolder !== '') {
            relativePath = currentFolder + '/' + relativePath
          } else {
            relativePath = relativePath.replace('..', '.')
          }
          return 'a href="' + relativePath + '"'
        })
      }
      origEnd.apply(this, arguments)
    }
    next()
  }

  app.use('/ftp', serveIndexMiddleware, serveIndex('ftp', { icons: true }))
  app.use('/ftp(?!/quarantine)/:file', servePublicFiles())
  app.use('/ftp/quarantine/:file', serveQuarantineFiles())

  app.use('/.well-known', serveIndexMiddleware, serveIndex('.well-known', { icons: true, view: 'details' }))
  app.use('/.well-known', express.static('.well-known'))

  app.use('/encryptionkeys', serveIndexMiddleware, serveIndex('encryptionkeys', { icons: true, view: 'details' }))
  app.use('/encryptionkeys/:file', serveKeyFiles())

  app.use('/support/logs', serveIndexMiddleware, serveIndex('logs', { icons: true, view: 'details' }))
  app.use('/support/logs', verify.accessControlChallenges())
  app.use('/support/logs/:file', serveLogFiles())

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

  app.use(express.static(path.resolve('frontend/dist/frontend')))
  app.use(cookieParser('kekse'))

  i18n.configure({
    locales: locales.map((locale: { key: string }) => locale.key),
    directory: path.resolve('i18n'),
    cookie: 'language',
    defaultLocale: 'en',
    autoReload: true
  })
  app.use(i18n.init)

  app.use(bodyParser.urlencoded({ extended: true }))
  app.post('/file-upload', uploadToMemory.single('file'), ensureFileIsPassed, metrics.observeFileUploadMetricsMiddleware(), checkUploadSize, checkFileType, handleZipFileUpload, handleXmlUpload, handleYamlUpload)
  app.post('/profile/image/file', uploadToMemory.single('file'), ensureFileIsPassed, metrics.observeFileUploadMetricsMiddleware(), profileImageFileUpload())
  app.post('/profile/image/url', uploadToMemory.single('file'), profileImageUrlUpload())
  app.post('/rest/memories', uploadToDisk.single('image'), ensureFileIsPassed, security.appendUserId(), metrics.observeFileUploadMetricsMiddleware(), addMemory())

  app.use(bodyParser.text({ type: '*/*' }))
  app.use(function jsonParser (req: Request, res: Response, next: NextFunction) {
    req.rawBody = req.body
    if (req.headers['content-type']?.includes('application/json')) {
      if (!req.body) {
        req.body = {}
      }
      if (req.body !== Object(req.body)) {
        req.body = JSON.parse(req.body)
      }
    }
    next()
  })

  const accessLogStream = getStream({
    filename: path.resolve('logs/access.log.%DATE%'),
    date_format: 'YYYY-MM-DD',
    audit_file: 'logs/audit.json',
    frequency: 'daily',
    verbose: false,
    max_logs: '2d'
  })