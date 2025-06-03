import chai from 'chai'
import config from 'config'
import type { Product as ProductConfig } from 'lib/config.types'

import fs from 'node:fs'
import path from 'node:path'
import { ExifImage } from 'exif'
import { Readable } from 'node:stream'
import sinonChai from 'sinon-chai'

import * as utils from '../../lib/utils'
import { finished } from 'node:stream/promises'

const expect = chai.expect
chai.use(sinonChai)

async function parseExifData (path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    new ExifImage({ image: path }, (error: Error | null, exifData: any) => {
      if (error) {
        expect.fail(`Could not read EXIF data from ${path}`)
        reject(error)
      }
      resolve(exifData)
    })
  })
}

describe('blueprint', () => {
  const products = config.get<ProductConfig[]>('products')
  let pathToImage: string = 'assets/public/images/products/'

  describe('checkExifData', () => {
    it('should contain properties from exifForBlueprintChallenge', async () => {
      for (const product of products) {
        if (product.fileForRetrieveBlueprintChallenge && product.image) {
          await handleImageDownload(product);
          if (product.exifForBlueprintChallenge?.[0]) {
            await validateExifData(product);
          }
        }
      }
    })
  })

  async function handleImageDownload(product: ProductConfig) {
    if (utils.isUrl(product.image)) {
      pathToImage = path.resolve('frontend/dist/frontend', pathToImage, product.image.substring(product.image.lastIndexOf('/') + 1))
      const response = await fetch(product.image)
      if (!response.ok || !response.body) {
        expect.fail(`Could not download image from ${product.image}`)
        return
      }
      const fileStream = fs.createWriteStream(pathToImage, { flags: 'w' })
      await finished(Readable.fromWeb(response.body as any).pipe(fileStream))
    } else {
      pathToImage = path.resolve('frontend/src', pathToImage, product.image)
    }
  }

  async function validateExifData(product: ProductConfig) {
    try {
      const exifData = await parseExifData(pathToImage)
      const properties = Object.values(exifData.image)
      for (const property of product.exifForBlueprintChallenge) {
        expect(properties).to.include(property)
      }
    } catch (error) {
      expect.fail(`Could not read EXIF data from ${pathToImage}`)
    }
  }
})