const {ScreenCast, logger} = require('.');

const screencast = new ScreenCast();

screencast.start();
process.on('exit', function(code) {
  if (screencast.isStarted()) {
    logger.debug('Stopping screencast');
    screencast.stop();
  }
  logger.debug(`Exiting with code ${code}`);
  return;
});
