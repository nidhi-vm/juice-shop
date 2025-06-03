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
  const files = fs.readdirSync(fixesPath)
  return files.filter(file => !file.endsWith('.info.yml') && !file.endsWith('.editorconfig'))
}

function writeToFile(json: CacheData) {
  fs.writeFileSync(cacheFile, JSON.stringify(json, null, '\t'))
}

function getDataFromFile() {
  const data = fs.readFileSync(cacheFile).toString()
  return JSON.parse(data)
}

function filterString(text: string) {
  return text.replace(/\r/g, '')
}

const checkDiffs = async (keys: string[]) => {
  const data: CacheData = keys.reduce((prev, curr) => ({
    ...prev,
    [curr]: { added: [], removed: [] }
  }), {})

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
  processDiff(diff, snippet, line, data[val], true)
  line = 0
  processDiff(diff, snippet, line, data[val], false)

  process.stdout.write('\n')
}

const processDiff = (diff: any[], snippet: any, line: number, dataEntry: any, isAdded: boolean) => {
  let norm = 0
  for (const part of diff) {
    if (!part.count) continue
    const prev = line
    line += part.count
    if (isAdded ? part.added : part.removed) {
      norm += isAdded ? -1 : 1
      for (let i = 0; i < part.count; i++) {
        const currentLine = prev + i + 1 - norm
        if (!snippet.vulnLines.includes(currentLine) && !snippet.neutralLines.includes(currentLine)) {
          process.stdout.write(isAdded ? colors.red(colors.inverse(currentLine.toString())) : colors.green(colors.inverse(currentLine.toString())))
          dataEntry[isAdded ? 'added' : 'removed'].push(currentLine)
        } else if (snippet.vulnLines.includes(currentLine)) {
          process.stdout.write(isAdded ? colors.red(colors.bold(currentLine.toString())) : colors.green(colors.bold(currentLine.toString())))
        } else if (snippet.neutralLines.includes(currentLine)) {
          process.stdout.write(isAdded ? colors.red(currentLine.toString()) : colors.green(currentLine.toString()))
        }
      }
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
      if (!dataValueAdded.every((val, ind) => fileDataValueAdded[ind] === val) || 
          !dataValueRemoved.every((val, ind) => fileDataValueRemoved[ind] === val)) {
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

export {
  checkDiffs,
  writeToFile,
  getDataFromFile,
  readFiles,
  seePatch,
  checkData
}