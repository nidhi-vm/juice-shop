describe('/#/photo-wall', () => {
  beforeEach(() => {
    cy.visit('/#/forgot-password')
    cy.intercept('GET', '/rest/user/security-question?email=*').as('securityQuestion')
  })

  const getAppDomain = () => {
    return cy.task<string>('GetFromConfig', 'application.domain')
  }

  const getAnswerFromMemories = (answerTask: string) => {
    return cy.task<string>('GetFromMemories', answerTask)
  }

  const fillFormAndSubmit = (email: string, answer: string) => {
    cy.get('#email').type(email)
    cy.wait('@securityQuestion')
    cy.get('#securityAnswer').should('not.be.disabled').focus().type(answer)
    cy.get('#newPassword').focus().type('123456')
    cy.get('#newPasswordRepeat').focus().type('123456')
    cy.get('#resetButton').click()
  }

  const completeChallenge = (challenge: string, answerTask: string, email: string) => {
    getAnswerFromMemories(answerTask).then((answer: string) => {
      getAppDomain().then((appDomain: string) => {
        fillFormAndSubmit(`${email}@${appDomain}`, answer)
        cy.expectChallengeSolved({ challenge })
      })
    })
  }

  describe('challenge "geoStalkingMeta"', () => {
    it('Should be possible to find the answer to a security question in the meta-data of a photo on the photo wall', () => {
      completeChallenge('Meta Geo Stalking', 'geoStalkingMetaSecurityAnswer', 'john')
    })
  })

  describe('challenge "geoStalkingVisual"', () => {
    it('Should be possible to determine the answer to a security question by looking closely at an image on the photo wall', () => {
      completeChallenge('Visual Geo Stalking', 'geoStalkingVisualSecurityAnswer', 'emma')
    })
  })
})