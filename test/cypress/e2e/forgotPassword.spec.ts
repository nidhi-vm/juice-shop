describe('/#/forgot-password', () => {
  beforeEach(() => {
    cy.get('body').then(($body) => {
      if ($body.find('#logout').length) {
        cy.get('#logout').click()
      }
    })
    cy.visit('/#/forgot-password')
    cy.intercept('GET', '/rest/user/security-question?email=*').as('securityQuestion')
  })

  const resetPasswordAsUser = (email: string, securityAnswer: string, newPassword: string, challenge: string) => {
    cy.task<string>('GetFromConfig', 'application.domain').then((appDomain: string) => {
      cy.get('#email').type(`${email}@${appDomain}`)
    })
    cy.wait('@securityQuestion')
    cy.get('#securityAnswer').should('not.be.disabled').focus().type(securityAnswer)
    cy.get('#newPassword').focus().type(newPassword)
    cy.get('#newPasswordRepeat').focus().type(newPassword)
    cy.get('#resetButton').click()
    cy.get('.confirmation').should('not.be.hidden')
    cy.expectChallengeSolved({ challenge })
  }

  describe('as Jim', () => {
    it('should be able to reset password with his security answer', () => {
      resetPasswordAsUser('jim', 'Samuel', 'I <3 Spock', "Reset Jim's Password")
    })
  })

  describe('as Bender', () => {
    it('should be able to reset password with his security answer', () => {
      resetPasswordAsUser('bender', "Stop'n'Drop", 'Brannigan 8=o Leela', "Reset Bender's Password")
    })
  })

  describe('as Bjoern', () => {
    describe('for his internal account', () => {
      it('should be able to reset password with his security answer', () => {
        resetPasswordAsUser('bjoern', 'West-2082', 'monkey birthday ', "Reset Bjoern's Password")
      })
    })

    describe('for his OWASP account', () => {
      it('should be able to reset password with his security answer', () => {
        cy.get('#email').type('bjoern@owasp.org')
        cy.wait('@securityQuestion')
        cy.get('#securityAnswer').should('not.be.disabled').focus().type('Zaya')
        cy.get('#newPassword').focus().type('kitten lesser pooch')
        cy.get('#newPasswordRepeat').focus().type('kitten lesser pooch')
        cy.get('#resetButton').click()
        cy.get('.confirmation').should('not.be.hidden')
        cy.expectChallengeSolved({ challenge: "Bjoern's Favorite Pet" })
      })
    })
  })

  describe('as Morty', () => {
    it('should be able to reset password with his security answer', () => {
      resetPasswordAsUser('morty', '5N0wb41L', 'iBurri3dMySe1f!', "Reset Morty's Password")
    })
  })

  describe('as Uvogin', () => {
    it('should be able to reset password with his security answer', () => {
      resetPasswordAsUser('uvogin', 'Silence of the Lambs', 'ora-ora > muda-muda', "Reset Uvogin's Password")
    })
  })
})