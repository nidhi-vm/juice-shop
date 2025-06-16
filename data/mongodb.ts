/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import * as MarsDB from 'marsdb'

export const reviewsCollection = new MarsDB.Collection('posts')
export const ordersCollection = new MarsDB.Collection('orders')