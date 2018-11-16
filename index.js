// nodejs index.js https://www.youtube.com/watch?v=qU0obFkA16M

const screencast = require('./src/screencast');

screencast.start();


setTimeout((function() {
  screencast.stop();
  return process.exit(0);
}), 100000);

process.on('exit', function(code) {
  return `Exiting with code ${code}`;
});
