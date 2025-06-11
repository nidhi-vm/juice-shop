import fs from 'node:fs'
import { Readable } from 'node:stream'
import { finished } from 'node:stream/promises'
import { type Request, type Response, type NextFunction } from 'express'

import * as security from '../lib/insecurity'
import { UserModel } from '../models/user'
import * as utils from '../lib/utils'
import logger from '../lib/logger'

export function profileImageUrlUpload() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.body.imageUrl !== undefined) {
      const url = req.body.imageUrl
      handleAbuseDetection(req, url)
      const loggedInUser = security.authenticatedUsers.get(req.cookies.token)
      if (loggedInUser) {
        try {
          await processImageUpload(url, loggedInUser, next)
        } catch (error) {
          await handleImageUploadError(loggedInUser, url, error, next)
        }
      } else {
        next(new Error('Blocked illegal activity by ' + req.socket.remoteAddress))
        return
      }
    }
    res.location(process.env.BASE_PATH + '/profile')
    res.redirect(process.env.BASE_PATH + '/profile')
  }
}

function handleAbuseDetection(req: Request, url: string) {
  if (url.match(/(.)*solve\/challenges\/server-side(.)*/) !== null) {
    req.app.locals.abused_ssrf_bug = true
  }
}

async function processImageUpload(url: string, loggedInUser: any, next: NextFunction) {
  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error('url returned a non-OK status code or an empty body')
  }
  const ext = getImageExtension(url)
  const fileStream = fs.createWriteStream(`frontend/dist/frontend/assets/public/images/uploads/${loggedInUser.data.id}.${ext}`, { flags: 'w' })
  await finished(Readable.fromWeb(response.body as any).pipe(fileStream))
  await updateUserProfileImage(loggedInUser.data.id, ext)
}

function getImageExtension(url: string): string {
  const ext = url.split('.').slice(-1)[0].toLowerCase()
  return ['jpg', 'jpeg', 'png', 'svg', 'gif'].includes(ext) ? ext : 'jpg'
}

async function updateUserProfileImage(userId: number, ext: string) {
  const user = await UserModel.findByPk(userId)
  return await user?.update({ profileImage: `/assets/public/images/uploads/${userId}.${ext}` })
}

async function handleImageUploadError(loggedInUser: any, url: string, error: Error, next: NextFunction) {
  try {
    const user = await UserModel.findByPk(loggedInUser.data.id)
    await user?.update({ profileImage: url })
    logger.warn(`Error retrieving user profile image: ${utils.getErrorMessage(error)}; using image link directly`)
  } catch (error) {
    next(error)
  }
}