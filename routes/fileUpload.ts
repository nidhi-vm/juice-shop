import os from 'node:os'
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import yaml from 'js-yaml'
import libxml from 'libxmljs'
import unzipper from 'unzipper'
import { type NextFunction, type Request, type Response } from 'express'

import * as challengeUtils from '../lib/challengeUtils'
import { challenges } from '../data/datacache'
import * as utils from '../lib/utils'

function ensureFileIsPassed ({ file }: Request, res: Response, next: NextFunction) {
  if (file != null) {
    next()
  } else {
    return res.status(400).json({ error: 'File is not passed' })
  }
}

function handleZipFileUpload ({ file }: Request, res: Response, next: NextFunction) {
  if (!utils.endsWith(file?.originalname.toLowerCase(), '.zip')) {
    return next()
  }
  
  if (file?.buffer == null || !utils.isChallengeEnabled(challenges.fileWriteChallenge)) {
    return res.status(204).end()
  }

  const buffer = file.buffer
  const filename = file.originalname.toLowerCase()
  const tempFile = path.join(os.tmpdir(), filename)

  fs.open(tempFile, 'w', (err, fd) => {
    if (err) return next(err)
    
    fs.write(fd, buffer, 0, buffer.length, null, (err) => {
      if (err) return next(err)
      
      fs.close(fd, () => {
        fs.createReadStream(tempFile)
          .pipe(unzipper.Parse())
          .on('entry', (entry: any) => handleZipEntry(entry, next))
          .on('error', (err: unknown) => next(err))
      })
    })
  })
}

function handleZipEntry(entry: any, next: NextFunction) {
  const fileName = entry.path
  const absolutePath = path.resolve('uploads/complaints/' + fileName)
  challengeUtils.solveIf(challenges.fileWriteChallenge, () => absolutePath === path.resolve('ftp/legal.md'))

  if (absolutePath.includes(path.resolve('.'))) {
    entry.pipe(fs.createWriteStream('uploads/complaints/' + fileName).on('error', (err) => next(err)))
  } else {
    entry.autodrain()
  }
}

function checkUploadSize ({ file }: Request, res: Response, next: NextFunction) {
  if (file != null) {
    challengeUtils.solveIf(challenges.uploadSizeChallenge, () => file.size > 100000)
  }
  next()
}

function checkFileType ({ file }: Request, res: Response, next: NextFunction) {
  const fileType = file?.originalname.substr(file.originalname.lastIndexOf('.') + 1).toLowerCase()
  challengeUtils.solveIf(challenges.uploadTypeChallenge, () => {
    return !(fileType === 'pdf' || fileType === 'xml' || fileType === 'zip' || fileType === 'yml' || fileType === 'yaml')
  })
  next()
}

function handleXmlUpload ({ file }: Request, res: Response, next: NextFunction) {
  if (!utils.endsWith(file?.originalname.toLowerCase(), '.xml')) {
    return next()
  }
  
  challengeUtils.solveIf(challenges.deprecatedInterfaceChallenge, () => true)

  if (file?.buffer == null || !utils.isChallengeEnabled(challenges.deprecatedInterfaceChallenge)) {
    return res.status(410).next(new Error('B2B customer complaints via file upload have been deprecated for security reasons (' + file?.originalname + ')'))
  }

  const data = file.buffer.toString()
  try {
    const sandbox = { libxml, data }
    vm.createContext(sandbox)
    const xmlDoc = vm.runInContext('libxml.parseXml(data, { noblanks: true, noent: true, nocdata: true })', sandbox, { timeout: 2000 })
    const xmlString = xmlDoc.toString(false)
    challengeUtils.solveIf(challenges.xxeFileDisclosureChallenge, () => utils.matchesEtcPasswdFile(xmlString) || utils.matchesSystemIniFile(xmlString))
    res.status(410).next(new Error('B2B customer complaints via file upload have been deprecated for security reasons: ' + utils.trunc(xmlString, 400) + ' (' + file.originalname + ')'))
  } catch (err: any) {
    handleError(err, file, next)
  }
}

function handleError(err: any, file: any, next: NextFunction) {
  if (utils.contains(err.message, 'Script execution timed out')) {
    if (challengeUtils.notSolved(challenges.xxeDosChallenge)) {
      challengeUtils.solve(challenges.xxeDosChallenge)
    }
    return next(new Error('Sorry, we are temporarily not available! Please try again later.'))
  }
  next(new Error('B2B customer complaints via file upload have been deprecated for security reasons: ' + err.message + ' (' + file.originalname + ')'))
}

function handleYamlUpload ({ file }: Request, res: Response, next: NextFunction) {
  if (!utils.endsWith(file?.originalname.toLowerCase(), '.yml') && !utils.endsWith(file?.originalname.toLowerCase(), '.yaml')) {
    return next()
  }
  
  challengeUtils.solveIf(challenges.deprecatedInterfaceChallenge, () => true)

  if (file?.buffer == null || !utils.isChallengeEnabled(challenges.deprecatedInterfaceChallenge)) {
    return res.status(410).next(new Error('B2B customer complaints via file upload have been deprecated for security reasons (' + file?.originalname + ')'))
  }

  const data = file.buffer.toString()
  try {
    const sandbox = { yaml, data }
    vm.createContext(sandbox)
    const yamlString = vm.runInContext('JSON.stringify(yaml.load(data))', sandbox, { timeout: 2000 })
    res.status(410).next(new Error('B2B customer complaints via file upload have been deprecated for security reasons: ' + utils.trunc(yamlString, 400) + ' (' + file.originalname + ')'))
  } catch (err: any) {
    handleYamlError(err, file, next)
  }
}

function handleYamlError(err: any, file: any, next: NextFunction) {
  if (utils.contains(err.message, 'Invalid string length') || utils.contains(err.message, 'Script execution timed out')) {
    if (challengeUtils.notSolved(challenges.yamlBombChallenge)) {
      challengeUtils.solve(challenges.yamlBombChallenge)
    }
    return next(new Error('Sorry, we are temporarily not available! Please try again later.'))
  }
  next(new Error('B2B customer complaints via file upload have been deprecated for security reasons: ' + err.message + ' (' + file.originalname + ')'))
}

export {
  ensureFileIsPassed,
  handleZipFileUpload,
  checkUploadSize,
  checkFileType,
  handleXmlUpload,
  handleYamlUpload
}