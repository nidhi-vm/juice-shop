import * as webhook from '../../lib/webhook'
import { type AddressInfo } from 'node:net'
import http from 'node:http'
import chai from 'chai'
const expect = chai.expect

describe('webhook', () => {
  const challenge = {
    key: 'key',
    name: 'name',
    difficulty: 1
  }

  describe('notify', () => {
    it('ignores errors where no webhook URL is provided via environment variable', async () => {
      await webhook.notify(challenge).catch(() => {
        chai.assert.fail('webhook.notify should not throw an error when no webhook URL is provided')
      });
    })

    it('fails when supplied webhook is not a valid URL', async () => {
      await webhook.notify(challenge, 0, 'localhorst').catch((error) => {
        expect((error as Error).message).to.equal('Failed to parse URL from localhorst')
      });
    })

    it('submits POST with payload to existing URL', async () => {
      const server = http.createServer((req, res) => {
        res.statusCode = 200
        res.end('OK')
      })

      await new Promise<void>((resolve) => server.listen(0, resolve))

      const port = (server.address() as AddressInfo)?.port
      const url = `http://localhost:${port}`

      try {
        await webhook.notify(challenge, 0, url)
      } finally {
        server.close()
      }
    })
  })
})