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
import { reviewsCollection, ordersCollection } from '../data/mongodb'
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

  const versionMetrics = createGauge(`${app}_version_info`, `Release version of ${config.get<string>('application.name')}.`, ['version', 'major', 'minor', 'patch'])
  const challengeSolvedMetrics = createGauge(`${app}_challenges_solved`, 'Number of solved challenges grouped by difficulty and category.', ['difficulty', 'category'])
  const challengeTotalMetrics = createGauge(`${app}_challenges_total`, 'Total number of challenges grouped by difficulty and category.', ['difficulty', 'category'])
  const codingChallengesProgressMetrics = createGauge(`${app}_coding_challenges_progress`, 'Number of coding challenges grouped by progression phase.', ['phase'])
  const cheatScoreMetrics = createGauge(`${app}_cheat_score`, 'Overall probability that any hacking or coding challenges were solved by cheating.')
  const accuracyMetrics = createGauge(`${app}_coding_challenges_accuracy`, 'Overall accuracy while solving coding challenges grouped by phase.', ['phase'])
  const orderMetrics = createGauge(`${app}_orders_placed_total`, `Number of orders placed in ${config.get<string>('application.name')}.`)
  const userMetrics = createGauge(`${app}_users_registered`, 'Number of registered users grouped by customer type.', ['type'])
  const userTotalMetrics = createGauge(`${app}_users_registered_total`, 'Total number of registered users.')
  const walletMetrics = createGauge(`${app}_wallet_balance_total`, 'Total balance of all users\' digital wallets.')
  const interactionsMetrics = createGauge(`${app}_user_social_interactions`, 'Number of social interactions with users grouped by type.', ['type'])

  const updateLoop = () => setInterval(() => {
    try {
      updateMetrics(versionMetrics, challengeSolvedMetrics, challengeTotalMetrics, codingChallengesProgressMetrics, cheatScoreMetrics, accuracyMetrics, orderMetrics, userMetrics, userTotalMetrics, walletMetrics, interactionsMetrics)
    } catch (e: unknown) {
      logger.warn('Error during metrics update loop: + ' + utils.getErrorMessage(e))
    }
  }, 5000)

  return {
    register,
    updateLoop
  }
}

function createGauge(name: string, help: string, labelNames?: string[]) {
  return new Prometheus.Gauge({ name, help, labelNames });
}

async function updateMetrics(versionMetrics, challengeSolvedMetrics, challengeTotalMetrics, codingChallengesProgressMetrics, cheatScoreMetrics, accuracyMetrics, orderMetrics, userMetrics, userTotalMetrics, walletMetrics, interactionsMetrics) {
  const version = utils.version()
  const { major, minor, patch } = version.match(/(?<major>\d+).(?<minor>\d+).(?<patch>\d+)/).groups
  versionMetrics.set({ version, major, minor, patch }, 1)

  const challengeStatuses = new Map()
  const challengeCount = new Map()

  for (const { difficulty, category, solved } of Object.values<ChallengeModel>(challenges)) {
    const key = `${difficulty}:${category}`
    challengeStatuses.set(key, (challengeStatuses.get(key) || 0) + (solved ? 1 : 0))
    challengeCount.set(key, (challengeCount.get(key) || 0) + 1)
  }

  for (const key of challengeStatuses.keys()) {
    const [difficulty, category] = key.split(':', 2)
    challengeSolvedMetrics.set({ difficulty, category }, challengeStatuses.get(key))
    challengeTotalMetrics.set({ difficulty, category }, challengeCount.get(key))
  }

  await updateCodingChallengesProgress(codingChallengesProgressMetrics);
  cheatScoreMetrics.set(totalCheatScore())
  accuracyMetrics.set({ phase: 'find it' }, accuracy.totalFindItAccuracy())
  accuracyMetrics.set({ phase: 'fix it' }, accuracy.totalFixItAccuracy());

  await updateOrderMetrics(orderMetrics);
  await updateUserMetrics(userMetrics, userTotalMetrics);
  await updateWalletMetrics(walletMetrics);
  await updateInteractionsMetrics(interactionsMetrics);
}

async function updateCodingChallengesProgress(codingChallengesProgressMetrics) {
  const challenges = await retrieveChallengesWithCodeSnippet();
  await Promise.all([
    updateChallengeCount(codingChallengesProgressMetrics, 1, 'find it'),
    updateChallengeCount(codingChallengesProgressMetrics, 2, 'fix it'),
    updateUnsolvedChallenges(codingChallengesProgressMetrics, challenges)
  ]);
}

async function updateChallengeCount(codingChallengesProgressMetrics, status, phase) {
  const count = await ChallengeModel.count({ where: { codingChallengeStatus: { [Op.eq]: status } } });
  codingChallengesProgressMetrics.set({ phase }, count);
}

async function updateUnsolvedChallenges(codingChallengesProgressMetrics, challenges) {
  const count = await ChallengeModel.count({ where: { codingChallengeStatus: { [Op.ne]: 0 } } });
  codingChallengesProgressMetrics.set({ phase: 'unsolved' }, challenges.length - count);
}

async function updateOrderMetrics(orderMetrics) {
  const orderCount = await ordersCollection.count({});
  if (orderCount) orderMetrics.set(orderCount);
}

async function updateUserMetrics(userMetrics, userTotalMetrics) {
  const standardCount = await UserModel.count({ where: { role: { [Op.eq]: 'customer' } } });
  if (standardCount) userMetrics.set({ type: 'standard' }, standardCount);

  const deluxeCount = await UserModel.count({ where: { role: { [Op.eq]: 'deluxe' } } });
  if (deluxeCount) userMetrics.set({ type: 'deluxe' }, deluxeCount);

  const totalCount = await UserModel.count();
  if (totalCount) userTotalMetrics.set(totalCount);
}

async function updateWalletMetrics(walletMetrics) {
  const totalBalance = await WalletModel.sum('balance');
  if (totalBalance) walletMetrics.set(totalBalance);
}

async function updateInteractionsMetrics(interactionsMetrics) {
  const feedbackCount = await FeedbackModel.count();
  if (feedbackCount) interactionsMetrics.set({ type: 'feedback' }, feedbackCount);

  const complaintCount = await ComplaintModel.count();
  if (complaintCount) interactionsMetrics.set({ type: 'complaint' }, complaintCount);
}