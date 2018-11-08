// Needed to start chrome
const chromeLauncher = require('chrome-launcher');
// Needed to send commands to chrome
const chromeRemoteInterface = require('chrome-remote-interface');

// For subprocecces
const exec = require('child_process').exec;
const execAsync = require('async-child-process').execAsync;

const args = require('./args');
const logger = require('./logger');
const ffmpegLauncher = require('./ffmpeg-launcher');