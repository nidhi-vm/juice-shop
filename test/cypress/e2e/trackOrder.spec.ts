describe('/#/track-order', () => {
  describe('challenge "reflectedXss"', () => {
    // Cypress alert bug
    xit('Order Id should be susceptible to reflected XSS attacks', () => {
      checkDockerAndRunTest();
    });
  });
});

function checkDockerAndRunTest() {
  cy.task('isDocker').then((isDocker) => {
    if (!isDocker) {
      handleUncaughtException();
      visitTrackResult();
      cy.reload();
      cy.on('window:alert', (t) => {
        expect(t).to.equal('xss');
      });
      cy.expectChallengeSolved({ challenge: 'Reflected XSS' });
    }
  });
}

function handleUncaughtException() {
  cy.on('uncaught:exception', (_err, _runnable) => {
    return false;
  });
}

function visitTrackResult() {
  cy.visit('/#/track-result');
  cy.visit('/#/track-result?id=<iframe src="javascript:alert(`xss`)">');
}