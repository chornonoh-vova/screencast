/* eslint-disable require-jsdoc */
// Needed to start chrome
const chromeLauncher = require('chrome-launcher');
// Needed to send commands to chrome
const chromeRemoteInterface = require('chrome-remote-interface');

// For subprocesses
const execAsync = require('async-child-process').execAsync;

// Utility
const args = require('./args');
const logger = require('./logger');
const ffmpegLauncher = require('./ffmpeg-launcher');
const stats = require('./stats');
const audio = require('./audio');

let audioDevice = 'audio-source-';

let started = false;

let chrome; let Page; let Runtime; let ffmpeg;

exports.start = async function() {
  // checking arguments
  args.getUrl();
  args.getOutputName();

  logger.debug(`Process PID: ${process.pid}`);

  chrome = await loadChrome();
  logger.debug(`Chrome PID: ${chrome.pid}`);
  audioDevice += chrome.pid;

  const sinkId = await initPulseAudio();

  // Remote interface
  const remoteInterface = await initRemoteInterface(chrome);
  // Listener for new frame
  remoteInterface.on('Page.screencastFrame', onScreencastFrame);

  Page = remoteInterface.Page;
  Runtime = remoteInterface.Runtime;

  // Initialization of page and runtime
  await Promise.all([Page.enable(), Runtime.enable()]);

  // Page.screencastFrame = onScreencastFrame;

  // Loading page
  await loadPage(args.getUrl());

  // Wait for page loading
  await Page.loadEventFired(async () => {
    logger.debug('Page.loadEventFired');
    started = true;
    await afterPageLoaded(chrome, sinkId);
  });
};

exports.stop = async function() {
  ffmpeg.stdin.pause();
  ffmpeg.kill();
  chrome.kill();
  started = false;
  // cleaning up virtual audio modules after end of screencast
  await execAsync(
      `pactl unload-module $(pactl list | ` +
      `grep -A5 'Name: ${audioDevice}.monitor' | ` +
      `grep 'Owner Module:' | awk '{print $3}')`);
};

exports.isStarted = function() {
  return started;
};

async function initPulseAudio() {
  try {
    // Set Default Sink
    await audio.setDefaultSink();

    // Create a new audio sink for this stream
    return await audio.createSink(audioDevice);
  } catch (error) {
    logger.error(error);
    throw error;
  }
}

function onScreencastFrame(event) {
  Page.screencastFrameAck({sessionId: event.sessionId}).catch((err) => {
    logger.error(err);
  });

  stats.track(event);

  if (ffmpeg == null) {
    return;
  }

  if (ffmpeg && ffmpeg.stdin) {
    stats.getStats.ffmpegReady = true;
    const lastImage = Buffer.from(event.data, 'base64');
    while (stats.getStats.framesToAddNow > 0) {
      // logger.log("Adding extra frame..");
      ffmpeg.stdin.write(lastImage);
      stats.getStats.framesDeltaForFPS++;
      stats.frameAdded();
    }
  }
}

async function afterPageLoaded(chrome, sinkId) {
  // get input id
  await execAsync('sleep 2');
  const inputIdList = await audio.getInputId(chrome.pid);

  for (let i = 0; i < inputIdList.length; i++) {
    const inputId = inputIdList[i];
    // move input to its corresponding sink
    await audio.moveInput(inputId, sinkId);
  }

  await startCapturingFrames();

  const params = ffmpegProcessParams(
      stats.getStats.currentFPS, 0, audioDevice, args.getOutputName(), null);
  ffmpeg = ffmpegLauncher.start(params);
}

async function loadPage(url) {
  logger.debug(`Loading page: ${url}`);
  await Page.navigate({url: url});
}

function startCapturingFrames() {
  logger.debug('Starting capturing screen frames..');
  return Page.startScreencast({format: 'jpeg'});
}

function ffmpegProcessParams(f, af, on, o, cb) {
  return {fps: f, audioOffset: af, outputName: on, output: o, callback: cb};
}

async function loadChrome() {
  try {
    logger.debug('Launching Chrome');
    return await launchChrome();
  } catch (error) {
    logger.error(`Failed to load Chrome: ${error}`);
  }
}

function initRemoteInterface(chrome) {
  const port = chrome.port;
  logger.debug(`Initialising remote interface on port: ${port}`);
  return chromeRemoteInterface({port: port});
}

// Helper for chrome launching
function launchChrome(headless = true) {
  return chromeLauncher.launch({
    chromeFlags: [
      '--window-size=1280,760', '--headless',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
}
