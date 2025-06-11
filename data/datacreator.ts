/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

/* jslint node: true */
import { AddressModel } from '../models/address'
import { BasketModel } from '../models/basket'
import { BasketItemModel } from '../models/basketitem'
import { CardModel } from '../models/card'
import { ChallengeModel } from '../models/challenge'
import { ComplaintModel } from '../models/complaint'
import { DeliveryModel } from '../models/delivery'
import { FeedbackModel } from '../models/feedback'
import { MemoryModel } from '../models/memory'
import { ProductModel } from '../models/product'
import { QuantityModel } from '../models/quantity'
import { RecycleModel } from '../models/recycle'
import { SecurityAnswerModel } from '../models/securityAnswer'
import { SecurityQuestionModel } from '../models/securityQuestion'
import { UserModel } from '../models/user'
import { WalletModel } from '../models/wallet'
import { type Product } from './types'
import logger from '../lib/logger'
import type { Memory as MemoryConfig, Product as ProductConfig } from '../lib/config.types'
import config from 'config'
import * as utils from '../lib/utils'
import type { StaticUser, StaticUserAddress, StaticUserCard } from './staticData'
import { loadStaticChallengeData, loadStaticDeliveryData, loadStaticUserData, loadStaticSecurityQuestionsData } from './staticData'
import { ordersCollection, reviewsCollection } from './mongodb'
import { AllHtmlEntities as Entities } from 'html-entities'
import * as datacache from './datacache'
import * as security from '../lib/insecurity'
import replace from 'replace'

const entities = new Entities()

export default async () => {
  const creators = [
    createSecurityQuestions,
    createUsers,
    createChallenges,
    createRandomFakeUsers,
    createProducts,
    createBaskets,
    createBasketItems,
    createAnonymousFeedback,
    createComplaints,
    createRecycleItem,
    createOrders,
    createQuantity,
    createWallet,
    createDeliveryMethods,
    createMemories,
    prepareFilesystem
  ]

  for (const creator of creators) {
    await creator()
  }
}

async function createChallenges () {
  const showHints = config.get<boolean>('challenges.showHints')
  const showMitigations = config.get<boolean>('challenges.showMitigations')

  const challenges = await loadStaticChallengeData()

  await Promise.all(
    challenges.map(async ({ name, category, description, difficulty, hint, hintUrl, mitigationUrl, key, disabledEnv, tutorial, tags }) => {
      const { enabled: isChallengeEnabled, disabledBecause } = utils.getChallengeEnablementStatus({ disabledEnv: disabledEnv?.join(';') ?? '' } as ChallengeModel)
      description = description.replace('juice-sh.op', config.get<string>('application.domain'))
      description = description.replace('&lt;iframe width=&quot;100%&quot; height=&quot;166&quot; scrolling=&quot;no&quot; frameborder=&quot;no&quot; allow=&quot;autoplay&quot; src=&quot;https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/771984076&amp;color=%23ff5500&amp;auto_play=true&amp;hide_related=false&amp;show_comments=true&amp;show_user=true&amp;show_reposts=false&amp;show_teaser=true&quot;&gt;&lt;/iframe&gt;', entities.encode(config.get('challenges.xssBonusPayload')))
      hint = hint.replace(/OWASP Juice Shop's/, `${config.get<string>('application.name')}'s`)

      try {
        datacache.challenges[key] = await ChallengeModel.create({
          key,
          name,
          category,
          tags: (tags != null) ? tags.join(',') : undefined,
          description: isChallengeEnabled ? description : (description + ' <em>(This challenge is <strong>potentially harmful</strong> on ' + disabledBecause + '!)</em>'),
          difficulty,
          solved: false,
          hint: showHints ? hint : null,
          hintUrl: showHints ? hintUrl : null,
          mitigationUrl: showMitigations ? mitigationUrl : null,
          disabledEnv: disabledBecause,
          tutorialOrder: (tutorial != null) ? tutorial.order : null,
          codingChallengeStatus: 0
        })
      } catch (err) {
        logger.error(`Could not insert Challenge ${name}: ${utils.getErrorMessage(err)}`)
      }
    })
  )
}

async function createUsers () {
  const users = await loadStaticUserData()

  await Promise.all(
    users.map(async ({ username, email, password, customDomain, key, role, deletedFlag, profileImage, securityQuestion, feedback, address, card, totpSecret, lastLoginIp = '' }) => {
      try {
        const completeEmail = customDomain ? email : `${email}@${config.get<string>('application.domain')}`
        const user = await UserModel.create({
          username,
          email: completeEmail,
          password,
          role,
          deluxeToken: role === security.roles.deluxe ? security.deluxeToken(completeEmail) : '',
          profileImage: `assets/public/images/uploads/${profileImage ?? (role === security.roles.admin ? 'defaultAdmin.png' : 'default.svg')}`,
          totpSecret,
          lastLoginIp
        })
        datacache.users[key] = user
        if (securityQuestion != null) await createSecurityAnswer(user.id, securityQuestion.id, securityQuestion.answer)
        if (feedback != null) await createFeedback(user.id, feedback.comment, feedback.rating, user.email)
        if (deletedFlag) await deleteUser(user.id)
        if (address != null) await createAddresses(user.id, address)
        if (card != null) await createCards(user.id, card)
      } catch (err) {
        logger.error(`Could not insert User ${key}: ${utils.getErrorMessage(err)}`)
      }
    })
  )
}

async function createWallet () {
  const users = await loadStaticUserData()
  return await Promise.all(
    users.map(async (user: StaticUser, index: number) => {
      return await WalletModel.create({
        UserId: index + 1,
        balance: user.walletBalance ?? 0
      }).catch((err: unknown) => {
        logger.error(`Could not create wallet: ${utils.getErrorMessage(err)}`)
      })
    })
  )
}

async function createDeliveryMethods () {
  const deliveries = await loadStaticDeliveryData()

  await Promise.all(
    deliveries.map(async ({ name, price, deluxePrice, eta, icon }) => {
      try {
        await DeliveryModel.create({
          name,
          price,
          deluxePrice,
          eta,
          icon
        })
      } catch (err) {
        logger.error(`Could not insert Delivery Method: ${utils.getErrorMessage(err)}`)
      }
    })
  )
}

async function createAddresses (UserId: number, addresses: StaticUserAddress[]) {
  return await Promise.all(
    addresses.map(async (address) => {
      return await AddressModel.create({
        UserId,
        country: address.country,
        fullName: address.fullName,
        mobileNum: address.mobileNum,
        zipCode: address.zipCode,
        streetAddress: address.streetAddress,
        city: address.city,
        state: address.state ? address.state : null
      }).catch((err: unknown) => {
        logger.error(`Could not create address: ${utils.getErrorMessage(err)}`)
      })
    })
  )
}

async function createCards (UserId: number, cards: StaticUserCard[]) {
  return await Promise.all(cards.map(async (card) => {
    return await CardModel.create({
      UserId,
      fullName: card.fullName,
      cardNum: Number(card.cardNum),
      expMonth: card.expMonth,
      expYear: card.expYear
    }).catch((err: unknown) => {
      logger.error(`Could not create card: ${utils.getErrorMessage(err)}`)
    })
  }))
}

async function deleteUser (userId: number) {
  return await UserModel.destroy({ where: { id: userId } }).catch((err: unknown) => {
    logger.error(`Could not perform soft delete for the user ${userId}: ${utils.getErrorMessage(err)}`)
  })
}

async function deleteProduct (productId: number) {
  return await ProductModel.destroy({ where: { id: productId } }).catch((err: unknown) => {
    logger.error(`Could not perform soft delete for the product ${productId}: ${utils.getErrorMessage(err)}`)
  })
}

async function createRandomFakeUsers () {
  function getGeneratedRandomFakeUserEmail () {
    const randomDomain = makeRandomString(4).toLowerCase() + '.' + makeRandomString(2).toLowerCase()
    return makeRandomString(5).toLowerCase() + '@' + randomDomain
  }

  function makeRandomString (length: number) {
    let text = ''
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    for (let i = 0; i < length; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)) }

    return text
  }

  return await Promise.all(new Array(config.get('application.numberOfRandomFakeUsers')).fill(0).map(
    async () => await UserModel.create({
      email: getGeneratedRandomFakeUserEmail(),
      password: makeRandomString(5)
    })
  ))
}

async function createQuantity () {
  return await Promise.all(
    config.get<ProductConfig[]>('products').map(async (product, index) => {
      return await QuantityModel.create({
        ProductId: index + 1,
        quantity: product.quantity ?? Math.floor(Math.random() * 70 + 30),
        limitPerUser: product.limitPerUser ?? null
      }).catch((err: unknown) => {
        logger.error(`Could not create quantity: ${utils.getErrorMessage(err)}`)
      })
    })
  )
}

async function createMemories () {
  const memories = [
    MemoryModel.create({
      imagePath: 'assets/public/images/uploads/ᓚᘏᗢ-#zatschi-#whoneedsfourlegs-1572600969477.jpg',
      caption: '😼 #zatschi #whoneedsfourlegs',
      UserId: datacache.users.bjoernOwasp.id
    }).catch((err: unknown) => {
      logger.error(`Could not create memory: ${utils.getErrorMessage(err)}`)
    }),
    ...structuredClone(config.get<MemoryConfig[]>('memories')).map(async (memory) => {
      let tmpImageFileName = memory.image
      if (utils.isUrl(memory.image)) {
        const imageUrl = memory.image
        tmpImageFileName = utils.extractFilename(memory.image)
        void utils.downloadToFile(imageUrl, 'frontend/dist/frontend/assets/public/images/uploads/' + tmpImageFileName)
      }
      if (memory.geoStalkingMetaSecurityQuestion && memory.geoStalkingMetaSecurityAnswer) {
        await createSecurityAnswer(datacache.users.john.id, memory.geoStalkingMetaSecurityQuestion, memory.geoStalkingMetaSecurityAnswer)
        memory.user = 'john'
      }
      if (memory.geoStalkingVisualSecurityQuestion && memory.geoStalkingVisualSecurityAnswer) {
        await createSecurityAnswer(datacache.users.emma.id, memory.geoStalkingVisualSecurityQuestion, memory.geoStalkingVisualSecurityAnswer)
        memory.user = 'emma'
      }
      if (!memory.user) {
        logger.warn(`Could not find user for memory ${memory.caption}!`)
        return
      }
      const userIdOfMemory = datacache.users[memory.user].id.valueOf() ?? null
      if (!userIdOfMemory) {
        logger.warn(`Could not find saved user for memory ${memory.caption}!`)
        return
      }

      return await MemoryModel.create({
        imagePath: 'assets/public/images/uploads/' + tmpImageFileName,
        caption: memory.caption,
        UserId: userIdOfMemory
      }).catch((err: unknown) => {
        logger.error(`Could not create memory: ${utils.getErrorMessage(err)}`)
      })
    })
  ]

  return await Promise.all(memories)
}

async function createProducts () {
  const products = structuredClone(config.get<ProductConfig[]>('products')).map((product) => {
    product.price = product.price ?? Math.floor(Math.random() * 9 + 1)
    product.deluxePrice = product.deluxePrice ?? product.price
    product.description = product.description || 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit.'

    product.image = product.image ?? 'undefined.png'
    if (utils.isUrl(product.image)) {
      const imageUrl = product.image
      product.image = utils.extractFilename(product.image)
      void utils.downloadToFile(imageUrl, 'frontend/dist/frontend/assets/public/images/products/' + product.image)
    }
    return product
  })

  const christmasChallengeProduct = products.find(({ useForChristmasSpecialChallenge }) => useForChristmasSpecialChallenge)
  const pastebinLeakChallengeProduct = products.find(({ keywordsForPastebinDataLeakChallenge }) => keywordsForPastebinDataLeakChallenge)
  const tamperingChallengeProduct = products.find(({ urlForProductTamperingChallenge }) => urlForProductTamperingChallenge)
  const blueprintRetrievalChallengeProduct = products.find(({ fileForRetrieveBlueprintChallenge }) => fileForRetrieveBlueprintChallenge)

  if (christmasChallengeProduct) {
    christmasChallengeProduct.description += ' (Seasonal special offer! Limited availability!)'
    christmasChallengeProduct.deletedDate = '2014-12-27 00:00:00.000 +00:00'
  }
  if (tamperingChallengeProduct) {
    tamperingChallengeProduct.description += ' <a href="' + tamperingChallengeProduct.urlForProductTamperingChallenge + '" target="_blank">More...</a>'
    delete tamperingChallengeProduct.deletedDate
  }
  if (pastebinLeakChallengeProduct) {
    pastebinLeakChallengeProduct.description += ' (This product is unsafe! We plan to remove