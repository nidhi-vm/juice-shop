describe('/#/register', () => {
  beforeEach(() => {
    cy.visit('/#/register')
  })

  describe('challenge "persistedXssUser"', () => {
    beforeEach(() => {
      cy.login({
        email: 'admin',
        password: 'admin123'
      })
    })

    it('should be possible to bypass validation by directly using Rest API', () => {
      cy.task('isDocker').then((isDocker) => {
        if (!isDocker) {
          handleXssChallenge()
        }
      })
    })
  })

  describe('challenge "registerAdmin"', () => {
    it('should be possible to register admin user using REST API', () => {
      registerUser({
        email: 'testing@test.com',
        password: 'pwned',
        passwordRepeat: 'pwned',
        role: 'admin'
      })
      cy.expectChallengeSolved({ challenge: 'Admin Registration' })
    })
  })

  describe('challenge "passwordRepeat"', () => {
    it('should be possible to register user without repeating the password', () => {
      registerUser({
        email: 'uncle@bob.com',
        password: 'ThereCanBeOnlyOne'
      })
      cy.expectChallengeSolved({ challenge: 'Repetitive Registration' })
    })
  })

  describe('challenge "registerEmptyUser"', () => {
    it('should be possible to register a user with blank email/password', () => {
      registerUser({
        email: '',
        password: '',
        passwordRepeat: ''
      })
      cy.expectChallengeSolved({ challenge: 'Empty User Registration' })
    })
  })

  function handleXssChallenge() {
    cy.window().then(() => {
      executeXssChallenge()
    })

    cy.visit('/#/administration')
    cy.on('window:alert', (t) => {
      expect(t).to.equal('xss')
    })
    cy.expectChallengeSolved({ challenge: 'Client-side XSS Protection' })
  }

  async function executeXssChallenge() {
    const response = await fetch(
      `${Cypress.config('baseUrl')}/api/Users/`,
      {
        method: 'POST',
        cache: 'no-cache',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify({
          email: '<iframe src="javascript:alert(`xss`)">',
          password: 'XSSed',
          passwordRepeat: 'XSSed',
          role: 'admin'
        })
      }
    )
    if (response.status === 201) {
      console.log('Success')
    }
  }

  function registerUser(user) {
    cy.window().then(() => {
      executeUserRegistration(user)
    })
  }

  async function executeUserRegistration(user) {
    const response = await fetch(`${Cypress.config('baseUrl')}/api/Users/`, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify(user)
    })
    if (response.status === 201) {
      console.log('Success')
    }
  }
})