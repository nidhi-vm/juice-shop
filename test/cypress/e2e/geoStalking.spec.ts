describe('/#/photo-wall', () => {
  beforeEach(() => {
    cy.visit('/#/forgot-password')
    cy.intercept('GET', '/rest/user/security-question?email=*').as('securityQuestion')
  })

  const findSecurityAnswer = (challenge: string, email: string) => {
    cy.task<string>('GetFromMemories', challenge).then((answer: string) => {
      cy.task<string>('GetFromConfig', 'application.domain').then((appDomain: string) => {
        cy.get('#email').type(`${email}@${appDomain}`)
        cy.wait('@securityQuestion')
        cy.get('#securityAnswer').should('not.be.disabled').focus().type(answer)
        cy.get('#newPassword').focus().type('123456')
        cy.get('#newPasswordRepeat').focus().type('123456')
        cy.get('#resetButton').click()
        cy.expectChallengeSolved({ challenge })
      })
    })
  }

  describe('challenge "geoStalkingMeta"', () => {
    it('Should be possible to find the answer to a security question in the meta-data of a photo on the photo wall', () => {
      findSecurityAnswer('geoStalkingMetaSecurityAnswer', 'john')
    })
  })

  describe('challenge "geoStalkingVisual"', () => {
    it('Should be possible to determine the answer to a security question by looking closely at an image on the photo wall', () => {
      findSecurityAnswer('geoStalkingVisualSecurityAnswer', 'emma')
    })
  })
})