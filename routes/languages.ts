import locales from '../data/static/locales.json'
import fs from 'node:fs'
import { type Request, type Response, type NextFunction } from 'express'

export function getLanguageList() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const languages: Array<{ key: string, lang: any, icons: string[], shortKey: string, percentage: unknown, gauge: string }> = []
    let count = 0
    let enContent: any

    try {
      enContent = await readFileAsync('frontend/dist/frontend/assets/i18n/en.json')
    } catch (err) {
      return next(new Error(`Unable to retrieve en.json language file: ${err.message}`))
    }

    fs.readdir('frontend/dist/frontend/assets/i18n/', async (err, languageFiles) => {
      if (err != null) {
        return next(new Error(`Unable to read i18n directory: ${err.message}`))
      }
      await Promise.all(languageFiles.map(async (fileName) => {
        if (fileName === 'en.json' || fileName === 'tlh_AA.json') {
          return
        }
        try {
          const fileContent = await readFileAsync('frontend/dist/frontend/assets/i18n/' + fileName)
          const percentage = await calcPercentage(fileContent, enContent)
          const key = fileName.substring(0, fileName.indexOf('.'))
          const locale = locales.find((l) => l.key === key)
          const lang: any = {
            key,
            lang: fileContent.LANGUAGE,
            icons: locale?.icons,
            shortKey: locale?.shortKey,
            percentage,
            gauge: getGauge(percentage)
          }
          languages.push(lang)
        } catch (err) {
          next(new Error(`Unable to retrieve ${fileName} language file: ${err.message}`))
        }
      }))
      languages.push({ key: 'en', icons: ['gb', 'us'], shortKey: 'EN', lang: 'English', percentage: 100, gauge: 'full' })
      languages.sort((a, b) => a.lang.localeCompare(b.lang))
      res.status(200).json(languages)
    })

    async function readFileAsync(filePath: string): Promise<any> {
      return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf-8', (err, content) => {
          if (err) {
            reject(err)
          } else {
            resolve(JSON.parse(content))
          }
        })
      })
    }

    async function calcPercentage(fileContent: any, enContent: any): Promise<number> {
      const totalStrings = Object.keys(enContent).length
      let differentStrings = 0
      for (const key in fileContent) {
        if (Object.prototype.hasOwnProperty.call(fileContent, key) && fileContent[key] !== enContent[key]) {
          differentStrings++
        }
      }
      return (differentStrings / totalStrings) * 100
    }

    function getGauge(percentage: number): string {
      return (percentage > 90 ? 'full' : (percentage > 70 ? 'three-quarters' : (percentage > 50 ? 'half' : (percentage > 30 ? 'quarter' : 'empty'))))
    }
  }
}