// Usage:
// node index.js <url to website> <output file path(output.mp4 by default)>
// Examples:
// node index.js https://www.youtube.com/watch?v=qU0obFkA16M

const {ScreenCast, logger} = require('.');

start();

const screencast1 = new ScreenCast();
const screencast2 = new ScreenCast();
screencast1.start('https://www.youtube.com/watch?v=qU0obFkA16M', 'output1.mp4');
screencast2.start();

setTimeout((function() {
  return process.exit(0);
}), 100000);

process.on('exit', function(code) {
  end();
  if (screencast1.isStarted()) {
    logger.debug('Stopping screencast');
    screencast1.stop();
  }
  if (screencast2.isStarted()) {
    logger.debug('Stopping screencast');
    screencast2.stop();
  }
  logger.debug(`Exiting with code ${code}`);
  return;
});

let startTime; let endTime;

function start() {
  startTime = new Date();
}

function end() {
  endTime = new Date();
  let timeDiff = endTime - startTime; // in ms
  // strip the ms
  timeDiff /= 1000;

  // get seconds
  const seconds = Math.round(timeDiff);
  console.log(seconds + ' seconds');
}
