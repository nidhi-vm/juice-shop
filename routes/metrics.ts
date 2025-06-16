/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { retrieveChallengesWithCodeSnippet } from './vulnCodeSnippet'
import { type Request, type Response, type NextFunction } from 'express'
import { ChallengeModel } from '../models/challenge'
import { UserModel } from '../models/user'
import { WalletModel } from '../models/wallet'
import { FeedbackModel } from '../models/feedback'
import { ComplaintModel } from '../models/complaint'
import { Op } from 'sequelize'
import * as challengeUtils from '../lib/challengeUtils'
import logger from '../lib/logger'
import config from 'config'
import * as utils from '../lib/utils'
import { totalCheatScore } from '../lib/antiCheat'
import * as accuracy from '../lib/accuracy'
import { ordersCollection } from '../data/mongodb'
import { challenges } from '../data/datacache'
import * as Prometheus from 'prom-client'
import onFinished from 'on-finished'

const register = Prometheus.register

const fileUploadsCountMetric = new Prometheus.Counter({
  name: 'file_uploads_count',
  help: 'Total number of successful file uploads grouped by file type.',
  labelNames: ['file_type']
})

const fileUploadErrorsMetric = new Prometheus.Counter({
  name: 'file_upload_errors',
  help: 'Total number of failed file uploads grouped by file type.',
  labelNames: ['file_type']
})

export function observeRequestMetricsMiddleware () {
  const httpRequestsMetric = new Prometheus.Counter({
    name: 'http_requests_count',
    help: 'Total HTTP request count grouped by status code.',
    labelNames: ['status_code']
  })

  return (req: Request, res: Response, next: NextFunction) => {
    onFinished(res, () => {
      const statusCode = `${Math.floor(res.statusCode / 100)}XX`
      httpRequestsMetric.labels(statusCode).inc()
    })
    next()
  }
}

export function observeFileUploadMetricsMiddleware () {
  return ({ file }: Request, res: Response, next: NextFunction) => {
    onFinished(res, () => {
      if (file != null) {
        res.statusCode < 400 ? fileUploadsCountMetric.labels(file.mimetype).inc() : fileUploadErrorsMetric.labels(file.mimetype).inc()
      }
    })
    next()
  }
}

export function serveMetrics () {
  return async (req: Request, res: Response, next: NextFunction) => {
    challengeUtils.solveIf(challenges.exposedMetricsChallenge, () => {
      const userAgent = req.headers['user-agent'] ?? ''
      return !userAgent.includes('Prometheus')
    })
    res.set('Content-Type', register.contentType)
    res.end(await register.metrics())
  }
}

export function observeMetrics () {
  const app = config.get<string>('application.customMetricsPrefix')
  Prometheus.collectDefaultMetrics({})
  register.setDefaultLabels({ app })

  const versionMetrics = new Prometheus.Gauge({
    name: `${app}_version_info`,
    help: `Release version of ${config.get<string>('application.name')}.`,
    labelNames: ['version', 'major', 'minor', 'patch']
  })

  const challengeSolvedMetrics = new Prometheus.Gauge({
    name: `${app}_challenges_solved`,
    help: 'Number of solved challenges grouped by difficulty and category.',
    labelNames: ['difficulty', 'category']
  })

  const challengeTotalMetrics = new Prometheus.Gauge({
    name: `${app}_challenges_total`,
    help: 'Total number of challenges grouped by difficulty and category.',
    labelNames: ['difficulty', 'category']
  })

  const codingChallengesProgressMetrics = new Prometheus.Gauge({
    name: `${app}_coding_challenges_progress`,
    help: 'Number of coding challenges grouped by progression phase.',
    labelNames: ['phase']
  })

  const cheatScoreMetrics = new Prometheus.Gauge({
    name: `${app}_cheat_score`,
    help: 'Overall probability that any hacking or coding challenges were solved by cheating.'
  })

  const accuracyMetrics = new Prometheus.Gauge({
    name: `${app}_coding_challenges_accuracy`,
    help: 'Overall accuracy while solving coding challenges grouped by phase.',
    labelNames: ['phase']
  })

  const orderMetrics = new Prometheus.Gauge({
    name: `${app}_orders_placed_total`,
    help: `Number of orders placed in ${config.get<string>('application.name')}.`
  })

  const userMetrics = new Prometheus.Gauge({
    name: `${app}_users_registered`,
    help: 'Number of registered users grouped by customer type.',
    labelNames: ['type']
  })

  const userTotalMetrics = new Prometheus.Gauge({
    name: `${app}_users_registered_total`,
    help: 'Total number of registered users.'
  })

  const walletMetrics = new Prometheus.Gauge({
    name: `${app}_wallet_balance_total`,
    help: 'Total balance of all users\' digital wallets.'
  })

  const interactionsMetrics = new Prometheus.Gauge({
    name: `${app}_user_social_interactions`,
    help: 'Number of social interactions with users grouped by type.',
    labelNames: ['type']
  })

  const updateLoop = () => setInterval(async () => {
    try {
      const version = utils.version()
      const { major, minor, patch } = version.match(/(?<major>\d+).(?<minor>\d+).(?<patch>\d+)/).groups
      versionMetrics.set({ version, major, minor, patch }, 1)

      const challengeStatuses = new Map()
      const challengeCount = new Map()

      for (const { difficulty, category, solved } of Object.values<ChallengeModel>(challenges)) {
        const key = `${difficulty}:${category}`

        challengeStatuses.set(key, (challengeStatuses.get(key) ?? 0) + (solved ? 1 : 0))
        challengeCount.set(key, (challengeCount.get(key) ?? 0) + 1)
      }

      for (const key of challengeStatuses.keys()) {
        const [difficulty, category] = key.split(':', 2)

        challengeSolvedMetrics.set({ difficulty, category }, challengeStatuses.get(key))
        challengeTotalMetrics.set({ difficulty, category }, challengeCount.get(key))
      }

      const challenges = await retrieveChallengesWithCodeSnippet();
      const challengeCounts = await Promise.all([
        ChallengeModel.count({ where: { codingChallengeStatus: { [Op.eq]: 1 } }}),
        ChallengeModel.count({ where: { codingChallengeStatus: { [Op.eq]: 2 } }}),
        ChallengeModel.count({ where: { codingChallengeStatus: { [Op.ne]: 0 } } })
      ]);

      codingChallengesProgressMetrics.set({ phase: 'find it' }, challengeCounts[0]);
      codingChallengesProgressMetrics.set({ phase: 'fix it' }, challengeCounts[1]);
      codingChallengesProgressMetrics.set({ phase: 'unsolved' }, challenges.length - challengeCounts[2]);

      cheatScoreMetrics.set(totalCheatScore())
      accuracyMetrics.set({ phase: 'find it' }, accuracy.totalFindItAccuracy())
      accuracyMetrics.set({ phase: 'fix it' }, accuracy.totalFixItAccuracy())

      const orderCount = await ordersCollection.count({});
      if (orderCount) orderMetrics.set(orderCount);

      const reviewCount = await reviewsCollection.count({});
      if (reviewCount) interactionsMetrics.set({ type: 'review' }, reviewCount);

      const userCounts = await Promise.all([
        UserModel.count({ where: { role: { [Op.eq]: 'customer' } }}),
        UserModel.count({ where: { role: { [Op.eq]: 'deluxe' } }}),
        UserModel.count()
      ]);

      if (userCounts[0]) userMetrics.set({ type: 'standard' }, userCounts[0]);
      if (userCounts[1]) userMetrics.set({ type: 'deluxe' }, userCounts[1]);
      if (userCounts[2]) userTotalMetrics.set(userCounts[2]);

      const totalBalance = await WalletModel.sum('balance');
      if (totalBalance) walletMetrics.set(totalBalance);

      const feedbackCount = await FeedbackModel.count();
      if (feedbackCount) interactionsMetrics.set({ type: 'feedback' }, feedbackCount);

      const complaintCount = await ComplaintModel.count();
      if (complaintCount) interactionsMetrics.set({ type: 'complaint' }, complaintCount);
    } catch (e: unknown) {
      logger.warn('Error during metrics update loop: + ' + utils.getErrorMessage(e))
    }
  }, 5000)

  return {
    register,
    updateLoop
  }
}