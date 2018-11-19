// Usage:
// node index.js <url to website> <output file path(output.mp4 by default)>
// Examples:
// node index.js https://www.youtube.com/watch?v=qU0obFkA16M

const { screencast, logger } = require('.');

screencast.start();

setTimeout((function() {
  return process.exit(0);
}), 100000);

process.on('exit', function(code) {
  if (screencast.isStarted()) {
    logger.info('Stopping screencast');
    screencast.stop();
  }
  logger.info(`Exiting with code ${code}`);
  return;
});
