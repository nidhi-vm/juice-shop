import fs from 'node:fs'
import colors from 'colors/safe'
import { diffLines, structuredPatch } from 'diff'
import { retrieveCodeSnippet } from '../routes/vulnCodeSnippet'

const fixesPath = 'data/static/codefixes'
const cacheFile = 'rsn/cache.json'

type CacheData = Record<string, {
  added: number[]
  removed: number[]
}>

function readFiles() {
  return fs.readdirSync(fixesPath).filter(file => !file.endsWith('.info.yml') && !file.endsWith('.editorconfig'))
}

function writeToFile(json: CacheData) {
  fs.writeFileSync(cacheFile, JSON.stringify(json, null, '\t'))
}

function getDataFromFile() {
  return JSON.parse(fs.readFileSync(cacheFile).toString())
}

function filterString(text: string) {
  return text.replace(/\r/g, '')
}

const checkDiffs = async (keys: string[]) => {
  const data: CacheData = Object.fromEntries(keys.map(key => [key, { added: [], removed: [] }]))

  for (const val of keys) {
    await processKey(val, data)
  }
  return data
}

const processKey = async (val: string, data: CacheData) => {
  const snippet = await retrieveCodeSnippet(val.split('_')[0])
  if (!snippet) return

  process.stdout.write(val + ': ')
  const fileData = fs.readFileSync(`${fixesPath}/${val}`).toString()
  const diff = diffLines(filterString(fileData), filterString(snippet.snippet))

  let line = 0
  let norm = 0

  diff.forEach(part => {
    if (!part.count) return
    const prev = line
    line += part.count

    if (part.added) {
      handleAddedLines(part, prev, snippet, data[val].added)
    } else if (part.removed) {
      handleRemovedLines(part, prev, snippet, data[val].removed, norm)
      norm += part.count
    }
  })

  process.stdout.write('\n')
}

const handleAddedLines = (part: any, prev: number, snippet: any, addedLines: number[]) => {
  for (let i = 0; i < part.count; i++) {
    const lineNumber = prev + i + 1
    if (!snippet.vulnLines.includes(lineNumber) && !snippet.neutralLines.includes(lineNumber)) {
      process.stdout.write(colors.red(colors.inverse(lineNumber.toString())))
      addedLines.push(lineNumber)
    } else if (snippet.vulnLines.includes(lineNumber)) {
      process.stdout.write(colors.red(colors.bold(lineNumber.toString())))
    } else if (snippet.neutralLines.includes(lineNumber)) {
      process.stdout.write(colors.red(lineNumber.toString()))
    }
  }
}

const handleRemovedLines = (part: any, prev: number, snippet: any, removedLines: number[], norm: number) => {
  for (let i = 0; i < part.count; i++) {
    const lineNumber = prev + i + 1 - norm
    if (!snippet.vulnLines.includes(lineNumber) && !snippet.neutralLines.includes(lineNumber)) {
      process.stdout.write(colors.green(colors.inverse(lineNumber.toString())))
      removedLines.push(lineNumber)
    } else if (snippet.vulnLines.includes(lineNumber)) {
      process.stdout.write(colors.green(colors.bold(lineNumber.toString())))
    } else if (snippet.neutralLines.includes(lineNumber)) {
      process.stdout.write(colors.green(lineNumber.toString()))
    }
  }
}

async function seePatch(file: string) {
  const fileData = fs.readFileSync(`${fixesPath}/${file}`).toString()
  const snippet = await retrieveCodeSnippet(file.split('_')[0])
  if (!snippet) return

  const patch = structuredPatch(file, file, filterString(snippet.snippet), filterString(fileData))
  console.log(colors.bold(file + '\n'))

  patch.hunks.forEach(hunk => {
    hunk.lines.forEach(line => {
      if (line[0] === '-') {
        console.log(colors.red(line))
      } else if (line[0] === '+') {
        console.log(colors.green(line))
      } else {
        console.log(line)
      }
    })
  })
  console.log('---------------------------------------')
}

function checkData(data: CacheData, fileData: CacheData) {
  const filesWithDiff = []

  for (const key in data) {
    const fileDataValueAdded = fileData[key].added.sort((a, b) => a - b)
    const dataValueAdded = data[key].added.sort((a, b) => a - b)
    const fileDataValueRemoved = fileData[key].removed.sort((a, b) => a - b)
    const dataValueRemoved = data[key].removed.sort((a, b) => a - b)

    if (fileDataValueAdded.length === dataValueAdded.length && fileDataValueRemoved.length === dataValueRemoved.length) {
      if (!arraysEqual(fileDataValueAdded, dataValueAdded) || !arraysEqual(fileDataValueRemoved, dataValueRemoved)) {
        console.log(colors.red(key))
        filesWithDiff.push(key)
      }
    } else {
      console.log(colors.red(key))
      filesWithDiff.push(key)
    }
  }
  return filesWithDiff
}

const arraysEqual = (a: number[], b: number[]) => a.length === b.length && a.every((val, index) => val === b[index])

export {
  checkDiffs,
  writeToFile,
  getDataFromFile,
  readFiles,
  seePatch,
  checkData
}