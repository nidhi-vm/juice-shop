import { type NextFunction, type Request, type Response } from 'express'
import yaml from 'js-yaml'
import fs from 'node:fs'

import { getCodeChallenges } from '../lib/codingChallenges'
import * as challengeUtils from '../lib/challengeUtils'
import * as accuracy from '../lib/accuracy'
import * as utils from '../lib/utils'
import { type ChallengeKey } from 'models/challenge'

interface SnippetRequestBody {
  challenge: string
}

interface VerdictRequestBody {
  selectedLines: number[]
  key: ChallengeKey
}

const setStatusCode = (error: any) => {
  return error.name === 'BrokenBoundary' ? 422 : 200
}

export const retrieveCodeSnippet = async (challengeKey: string) => {
  const codeChallenges = await getCodeChallenges()
  return codeChallenges.has(challengeKey) ? codeChallenges.get(challengeKey) ?? null : null
}

export const serveCodeSnippet = () => async (req: Request<SnippetRequestBody>, res: Response, next: NextFunction) => {
  try {
    const snippetData = await retrieveCodeSnippet(req.params.challenge)
    if (!snippetData) {
      res.status(404).json({ status: 'error', error: `No code challenge for challenge key: ${req.params.challenge}` })
      return
    }
    res.status(200).json({ snippet: snippetData.snippet })
  } catch (error) {
    res.status(setStatusCode(error)).json({ status: 'error', error: utils.getErrorMessage(error) })
  }
}

export const retrieveChallengesWithCodeSnippet = async () => {
  const codeChallenges = await getCodeChallenges()
  return [...codeChallenges.keys()]
}

export const serveChallengesWithCodeSnippet = () => async (req: Request, res: Response) => {
  const codingChallenges = await retrieveChallengesWithCodeSnippet()
  res.json({ challenges: codingChallenges })
}

const generateHint = (vulnLines: number[], key: ChallengeKey, res: Response) => {
  if (vulnLines.length === 1) {
    return res.__('Line {{vulnLine}} is responsible for this vulnerability or security flaw. Select it and submit to proceed.', { vulnLine: vulnLines[0].toString() })
  }
  return res.__('Lines {{vulnLines}} are responsible for this vulnerability or security flaw. Select them and submit to proceed.', { vulnLines: vulnLines.toString() })
}

export const getVerdict = (vulnLines: number[], neutralLines: number[], selectedLines: number[]) => {
  if (!selectedLines || vulnLines.length > selectedLines.length || !vulnLines.every(e => selectedLines.includes(e))) return false
  const okLines = [...vulnLines, ...neutralLines]
  return selectedLines.every(x => okLines.includes(x))
}

export const checkVulnLines = () => async (req: Request<Record<string, unknown>, Record<string, unknown>, VerdictRequestBody>, res: Response, next: NextFunction) => {
  const key = req.body.key
  let snippetData
  try {
    snippetData = await retrieveCodeSnippet(key)
    if (!snippetData) {
      res.status(404).json({ status: 'error', error: `No code challenge for challenge key: ${key}` })
      return
    }
  } catch (error) {
    res.status(setStatusCode(error)).json({ status: 'error', error: utils.getErrorMessage(error) })
    return
  }
  
  const { vulnLines, neutralLines } = snippetData
  const selectedLines = req.body.selectedLines
  const verdict = getVerdict(vulnLines, neutralLines, selectedLines)
  let hint

  if (fs.existsSync(`./data/static/codefixes/${key}.info.yml`)) {
    const codingChallengeInfos = yaml.load(fs.readFileSync(`./data/static/codefixes/${key}.info.yml`, 'utf8'))
    if (codingChallengeInfos?.hints) {
      const attempts = accuracy.getFindItAttempts(key)
      if (attempts > codingChallengeInfos.hints.length) {
        hint = generateHint(vulnLines, key, res)
      } else {
        const nextHint = codingChallengeInfos.hints[attempts - 1]
        if (nextHint) hint = res.__(nextHint)
      }
    }
  }

  if (verdict) {
    await challengeUtils.solveFindIt(key)
    res.status(200).json({ verdict: true })
  } else {
    accuracy.storeFindItVerdict(key, false)
    res.status(200).json({ verdict: false, hint })
  }
}