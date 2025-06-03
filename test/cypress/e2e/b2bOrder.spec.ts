describe('/b2b/v2/order', () => {
  const performRequest = async (bodyData, expectedStatus) => {
    const response = await fetch(
      `${Cypress.config('baseUrl')}/b2b/v2/orders/`,
      {
        method: 'POST',
        cache: 'no-cache',
        headers: {
          'Content-type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ orderLinesData: bodyData })
      }
    );
    return response.status === expectedStatus;
  };

  const handleChallenge = (challenge, bodyData, expectedStatus) => {
    cy.task('isDocker').then(async (isDocker) => {
      if (!isDocker) {
        await cy.login({ email: 'admin', password: 'admin123' });
        const success = await performRequest(bodyData, expectedStatus);
        if (success) {
          console.log('Success');
        }
        cy.expectChallengeSolved({ challenge });
      }
    });
  };

  describe('challenge "rce"', () => {
    it('an infinite loop deserialization payload should not bring down the server', () => {
      handleChallenge('Blocked RCE DoS', '(function dos() { while(true); })()', 500);
    });
  });

  describe('challenge "rceOccupy"', () => {
    it('should be possible to cause request timeout using a recursive regular expression payload', () => {
      handleChallenge('Successful RCE DoS', "/((a+)+)b/.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaaa')", 503);
    });
  });
});