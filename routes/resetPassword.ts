import config from 'config'
import { type Request, type Response, type NextFunction } from 'express'

import type { Memory as MemoryConfig } from '../lib/config.types'
import { SecurityAnswerModel } from '../models/securityAnswer'
import * as challengeUtils from '../lib/challengeUtils'
import { challenges, users } from '../data/datacache'
import * as security from '../lib/insecurity'
import { UserModel } from '../models/user'

export function resetPassword() {
  return async ({ body, connection }: Request, res: Response, next: NextFunction) => {
    const email = body.email
    const answer = body.answer
    const newPassword = body.new
    const repeatPassword = body.repeat

    if (!email || !answer) {
      return next(new Error('Blocked illegal activity by ' + connection.remoteAddress))
    }
    if (!newPassword || newPassword === 'undefined') {
      return res.status(401).send(res.__('Password cannot be empty.'))
    }
    if (newPassword !== repeatPassword) {
      return res.status(401).send(res.__('New and repeated password do not match.'))
    }

    try {
      const data = await SecurityAnswerModel.findOne({
        include: [{
          model: UserModel,
          where: { email }
        }]
      })

      if (data != null && security.hmac(answer) === data.answer) {
        const user = await UserModel.findByPk(data.UserId)
        if (user) {
          await user.update({ password: newPassword })
          verifySecurityAnswerChallenges(user, answer)
          return res.json({ user })
        }
      } else {
        return res.status(401).send(res.__('Wrong answer to security question.'))
      }
    } catch (error) {
      return next(error)
    }
  }
}

function verifySecurityAnswerChallenges(user: UserModel, answer: string) {
  challengeUtils.solveIf(challenges.resetPasswordJimChallenge, () => user.id === users.jim.id && answer === 'Samuel')
  challengeUtils.solveIf(challenges.resetPasswordBenderChallenge, () => user.id === users.bender.id && answer === 'Stop\'n\'Drop')
  challengeUtils.solveIf(challenges.resetPasswordBjoernChallenge, () => user.id === users.bjoern.id && answer === 'West-2082')
  challengeUtils.solveIf(challenges.resetPasswordMortyChallenge, () => user.id === users.morty.id && answer === '5N0wb41L')
  challengeUtils.solveIf(challenges.resetPasswordBjoernOwaspChallenge, () => user.id === users.bjoernOwasp.id && answer === 'Zaya')
  challengeUtils.solveIf(challenges.resetPasswordUvoginChallenge, () => user.id === users.uvogin.id && answer === 'Silence of the Lambs')

  challengeUtils.solveIf(challenges.geoStalkingMetaChallenge, () => {
    const securityAnswer = getSecurityAnswer('geoStalkingMetaSecurityAnswer')
    return user.id === users.john.id && answer === securityAnswer
  })

  challengeUtils.solveIf(challenges.geoStalkingVisualChallenge, () => {
    const securityAnswer = getSecurityAnswer('geoStalkingVisualSecurityAnswer')
    return user.id === users.emma.id && answer === securityAnswer
  })
}

function getSecurityAnswer(answerKey: string) {
  const memories = config.get<MemoryConfig[]>('memories')
  for (const memory of memories) {
    if (memory[answerKey]) {
      return memory[answerKey]
    }
  }
  return undefined
}