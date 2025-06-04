import { type Request, type Response, type NextFunction } from 'express'

import * as challengeUtils from '../lib/challengeUtils'
import { type ProductModel } from '../models/product'
import { MemoryModel } from '../models/memory'
import { challenges } from '../data/datacache'
import * as security from '../lib/insecurity'
import * as db from '../data/mongodb'

export function dataExport() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const loggedInUser = security.authenticatedUsers.get(req.headers?.authorization?.replace('Bearer ', ''))
    if (loggedInUser?.data?.email && loggedInUser.data.id) {
      try {
        const userData = await getUserData(loggedInUser, req);
        res.status(200).send({ userData: JSON.stringify(userData, null, 2), confirmation: 'Your data export will open in a new Browser window.' });
      } catch (error) {
        next(error);
      }
    } else {
      next(new Error('Blocked illegal activity by ' + req.socket.remoteAddress))
    }
  }
}

async function getUserData(loggedInUser, req) {
  const username = loggedInUser.data.username
  const email = loggedInUser.data.email
  const updatedEmail = email.replace(/[aeiou]/gi, '*')
  const userData = {
    username,
    email,
    orders: [],
    reviews: [],
    memories: []
  }

  await Promise.all([
    populateMemories(userData, req),
    populateOrders(userData, updatedEmail),
    populateReviews(userData, email)
  ]);

  const emailHash = security.hash(email).slice(0, 4);
  for (const order of userData.orders) {
    challengeUtils.solveIf(challenges.dataExportChallenge, () => { return order.orderId.split('-')[0] !== emailHash })
  }
  
  return userData;
}

async function populateMemories(userData, req) {
  const memories = await MemoryModel.findAll({ where: { UserId: req.body.UserId } });
  memories.forEach((memory: MemoryModel) => {
    userData.memories.push({
      imageUrl: req.protocol + '://' + req.get('host') + '/' + memory.imagePath,
      caption: memory.caption
    });
  });
}

async function populateOrders(userData, updatedEmail) {
  const orders = await db.ordersCollection.find({ email: updatedEmail });
  if (orders.length > 0) {
    orders.forEach(order => {
      userData.orders.push({
        orderId: order.orderId,
        totalPrice: order.totalPrice,
        products: [...order.products],
        bonus: order.bonus,
        eta: order.eta
      });
    });
  }
}

async function populateReviews(userData, email) {
  const reviews = await db.reviewsCollection.find({ author: email });
  if (reviews.length > 0) {
    reviews.forEach(review => {
      userData.reviews.push({
        message: review.message,
        author: review.author,
        productId: review.product,
        likesCount: review.likesCount,
        likedBy: review.likedBy
      });
    });
  }
}