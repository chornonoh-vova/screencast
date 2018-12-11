// Usage:
// node index.js <url to website> <output file path(output.mp4 by default)>
// Examples:
// node index.js https://www.youtube.com/watch?v=qU0obFkA16M

const exec = require('child_process').exec;

const screencast = exec('node recording.js https://www.youtube.com/watch?v=0I647GU3Jsc output3.mp4');

setTimeout((function() {
  console.log('ended recording');
  screencast.kill();
  exec(`kill -INT ${screencast.pid + 1}`);
}), 200 * 1000);

process.on('exit', function(code) {
  
});


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
