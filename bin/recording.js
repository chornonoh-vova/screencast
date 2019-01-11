#!/usr/bin/env node

const {ScreenCast, logger} = require('../src/main');

const screencast = new ScreenCast();

screencast.start();

process.on('exit', function(code) {
  logger.debug('Stopping screencast');

  screencast.stop();

  logger.debug(`Exiting with code ${code}`);
  return;
});
