const {ScreenCast, logger} = require('.');

// start();
const screencast = new ScreenCast();

screencast.start();

//setTimeout((function() {
//  return process.exit(0);
//}), 100000);

process.on('exit', function(code) {
  //end();
  if (screencast.isStarted()) {
    logger.debug('Stopping screencast');
    screencast.stop();
  }
  logger.debug(`Exiting with code ${code}`);
  return;
});

var startTime, endTime;

function start() {
  startTime = new Date();
};

function end() {
  endTime = new Date();
  var timeDiff = endTime - startTime; //in ms
  // strip the ms
  timeDiff /= 1000;

  // get seconds
  var seconds = Math.round(timeDiff);
  console.log(seconds + " seconds");
}
