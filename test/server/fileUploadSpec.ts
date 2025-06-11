import chai from 'chai'
import { challenges } from '../../data/datacache'
import { type Challenge } from 'data/types'
import { checkUploadSize, checkFileType } from '../../routes/fileUpload'

const expect = chai.expect

describe('fileUpload', () => {
  let req: any
  let res: any
  let save: any

  beforeEach(() => {
    req = { file: { originalname: '' } }
    res = {}
    save = () => ({
      then () { }
    })
  })

  const testUploadSizeChallenge = (size: number) => {
    it(`${size} bytes`, () => {
      challenges.uploadSizeChallenge = { solved: false, save } as unknown as Challenge
      req.file.size = size

      checkUploadSize(req, res, () => {})

      expect(challenges.uploadSizeChallenge.solved).to.equal(size > 100000);
    })
  }

  describe('should not solve "uploadSizeChallenge" when file size is', () => {
    const sizes = [0, 1, 100, 1000, 10000, 99999]
    sizes.forEach(testUploadSizeChallenge)
  })

  it('should solve "uploadSizeChallenge" when file size exceeds 100000 bytes', () => {
    challenges.uploadSizeChallenge = { solved: false, save } as unknown as Challenge
    req.file.size = 100001

    checkUploadSize(req, res, () => {})

    expect(challenges.uploadSizeChallenge.solved).to.equal(true)
  })

  const testUploadTypeChallenge = (fileName: string, expected: boolean) => {
    it(`should ${expected ? '' : 'not '}solve "uploadTypeChallenge" when file type is ${fileName}`, () => {
      challenges.uploadTypeChallenge = { solved: false, save } as unknown as Challenge
      req.file.originalname = fileName

      checkFileType(req, res, () => {})

      expect(challenges.uploadTypeChallenge.solved).to.equal(expected);
    })
  }

  testUploadTypeChallenge('hack.exe', true)
  testUploadTypeChallenge('hack.pdf', false)
})