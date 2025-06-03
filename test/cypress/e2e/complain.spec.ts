describe('/#/complain', () => {
  beforeEach(() => {
    cy.login({
      email: 'admin',
      password: 'admin123'
    })

    cy.visit('/#/complain')
  })

  const uploadFile = async (fileName, fileType, content) => {
    const data = new FormData()
    const blob = new Blob([content], { type: fileType })
    data.append('file', blob, fileName)

    await fetch(`${Cypress.config('baseUrl')}/file-upload`, {
      method: 'POST',
      cache: 'no-cache',
      body: data
    })
  }

  describe('challenge "uploadSize"', () => {
    it('should be possible to upload files greater 100 KB directly through backend', () => {
      cy.window().then(async () => {
        const over100KB = Array.apply(null, new Array(11000)).map(
          String.prototype.valueOf,
          '1234567890'
        )
        await uploadFile('invalidSizeForClient.pdf', 'application/pdf', over100KB)
      })
      cy.expectChallengeSolved({ challenge: 'Upload Size' })
    })
  })

  describe('challenge "uploadType"', () => {
    it('should be possible to upload files with other extension than .pdf directly through backend', () => {
      cy.window().then(async () => {
        await uploadFile('invalidTypeForClient.exe', 'application/x-msdownload', 'test')
      })
      cy.expectChallengeSolved({ challenge: 'Upload Type' })
    })
  })

  describe('challenge "deprecatedInterface"', () => {
    it('should be possible to upload XML files', () => {
      cy.get('#complaintMessage').type('XML all the way!')
      cy.get('#file').selectFile('test/files/deprecatedTypeForServer.xml')
      cy.get('#submitButton').click()
      cy.expectChallengeSolved({ challenge: 'Deprecated Interface' })
    })
  })

  const handleDockerCheck = (message, filePath) => {
    cy.task('isDocker').then((isDocker) => {
      if (!isDocker) {
        cy.get('#complaintMessage').type(message)
        cy.get('#file').selectFile(filePath)
        cy.get('#submitButton').click()
      }
    })
  }

  describe('challenge "xxeFileDisclosure"', () => {
    it('(triggered for Windows server via .xml upload with XXE attack)', () => {
      handleDockerCheck('XXE File Exfiltration Windows!', 'test/files/xxeForWindows.xml')
    })

    it('(triggered for Linux server via .xml upload with XXE attack)', () => {
      handleDockerCheck('XXE File Exfiltration Linux!', 'test/files/xxeForLinux.xml')
    })

    it('should be solved either through Windows- or Linux-specific attack path', () => {
      cy.task('isDocker').then((isDocker) => {
        if (!isDocker) {
          cy.expectChallengeSolved({ challenge: 'XXE Data Access' })
        }
      })
    })
  })

  describe('challenge "xxeDos"', () => {
    it('(triggered via .xml upload with dev/random attack)', () => {
      handleDockerCheck('XXE Dev Random!', 'test/files/xxeDevRandom.xml')
      cy.wait(5000) // Wait for 2.5x timeout of XML parser
    })

    it('(triggered via .xml upload with Quadratic Blowup attack)', () => {
      handleDockerCheck('XXE Quadratic Blowup!', 'test/files/xxeQuadraticBlowup.xml')
      cy.wait(5000) // Wait for 2.5x timeout of XML parser
    })

    xit('should be solved either through dev/random or Quadratic Blowup attack', () => {
      cy.task('isDocker').then((isDocker) => {
        if (!isDocker) {
          cy.expectChallengeSolved({ challenge: 'XXE DoS' })
        }
      })
    })
  })

  describe('challenge "yamlBomb"', () => {
    it('should be solved via .yaml upload with a Billion Laughs-style attack', () => {
      handleDockerCheck('YAML Bomb!', 'test/files/yamlBomb.yml')
      cy.wait(5000) // Wait for 2.5x possible timeout of YAML parser
      cy.expectChallengeSolved({ challenge: 'Memory Bomb' })
    })
  })

  describe('challenge "arbitraryFileWrite"', () => {
    it('should be possible to upload zip file with filenames having path traversal', () => {
      handleDockerCheck('Zip Slip!', 'test/files/arbitraryFileWrite.zip')
      cy.expectChallengeSolved({ challenge: 'Arbitrary File Write' })
    })
  })

  describe('challenge "videoXssChallenge"', () => {
    it('should be possible to inject js in subtitles by uploading zip file with filenames having path traversal', () => {
      cy.task('isDocker').then((isDocker) => {
        if (!isDocker) {
          cy.get('#complaintMessage').type('Here we go!')
          cy.get('#file').selectFile('test/files/videoExploit.zip')
          cy.get('#submitButton').click()
          cy.visit('/promotion')

          cy.on('window:alert', (t) => {
            expect(t).to.equal('xss')
          })
          cy.visit('/')
          cy.expectChallengeSolved({ challenge: 'Video XSS' })
        }
      })
    })
  })
})