// Needed to start chrome
const chromeLauncher = require('chrome-launcher');
// Needed to send commands to chrome
const chromeRemoteInterface = require('chrome-remote-interface');

// For subprocecces
const exec = require('child_process').exec;
const execAsync = require('async-child-process').execAsync;

// Utility
const args = require('./args');
const logger = require('./logger');
const ffmpegLauncher = require('./ffmpeg-launcher');
const stats = require('./stats');
const audio = require('./audio');

var queue, chrome, Page, Runtime, ffmpeg;
var lastRestartDateTime = 0;

exports.start = async function() {
  // checking arguments
  args.getUrl();
  args.getOutputName();

  logger.debug(`Process PID: ${process.pid}`);

  chrome = await loadChrome();
  logger.debug(`Chrome PID: ${chrome.pid}`);

  const sinkId = await initPulseAudio();

  // Remote interface
  const remoteInterface = await initRemoteInterface(chrome);
  // Listener for new frame
  remoteInterface.on('Page.screencastFrame', onScreencastFrame);

  Page = remoteInterface.Page;
  Runtime = remoteInterface.Runtime;

  // Initialization of page and runtime
  await Promise.all([Page.enable(), Runtime.enable()]);

  Page.screencastFrame = onScreencastFrame;

  // Loading page
  await loadPage(args.getUrl());

  // Wait for page loading
  await Page.loadEventFired(async() => {
    logger.debug('Page.loadEventFired');
    await afterPageLoaded(chrome, sinkId);
  });
};

exports.stop =
    function() {
  ffmpeg.stdin.pause();
  ffmpeg.kill();
  chrome.kill();
}

async function
initPulseAudio() {
  try {
    // Set Default Sink
    await audio.setDefaultSink();

    // Create a new audio sink for this stream
    return await audio.createSink('experiment');
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

  const nextRestart = lastRestartDateTime + 10000;
  const newRestartDateTime = new Date().getTime();
  if (stats.getStats.ffmpegRestartSuggested &&
      nextRestart < newRestartDateTime) {
    lastRestartDateTime = newRestartDateTime;
    stats.getStats.ffmpegRestartSuggested = false;
    stats.getStats.ffmpegRestartSuggestedCounter = 0;
    stats.resetSmoothingAlgoStats();
    const params = ffmpegProcessParams(
        stats.getStats.currentFPS, 0, 'experiment', args.getOutputName(),
        ffmpegSet);
    ffmpeg = ffmpegLauncher.restart(params);
    return;
  }

  if (ffmpeg && ffmpeg.stdin) {
    stats.getStats.ffmpegReady = true;
    lastImage = new Buffer(event.data, 'base64');
    while (stats.getStats.framesToAddNow > 0) {
      // logger.log("Adding extra frame..");
      ffmpeg.stdin.write(lastImage);
      stats.getStats.framesDeltaForFPS++;
      stats.frameAdded();
    }
  }
}

function ffmpegSet(f) {
  ffmpeg = f;
}

async function afterPageLoaded(chrome, sinkId) {
  // get input id
  await execAsync('sleep 2');
  const inputIdList = await audio.getInputId(chrome.pid);

  for (i = 0; i < inputIdList.length; i++) {
    var inputId = inputIdList[i];
    // move input to its corresponding sink
    await audio.moveInput(inputId, sinkId);
  }

  await startCapturingFrames();

  const params = ffmpegProcessParams(
      stats.getStats.currentFPS, 0, 'experiment', args.getOutputName(), null);
  ffmpeg = ffmpegLauncher.start(params);
}

async function loadPage(url) {
  logger.debug(`Loading page: ${url}`);
  await Page.navigate({url: url});
}

function
startCapturingFrames() {
  logger.debug('Starting capturing screen frames..');
  return Page.startScreencast({format: 'jpeg', quality: 100});
}

function ffmpegProcessParams(f, af, on, o, cb) {
  return {fps: f, audioOffset: af, outputName: on, output: o, callback: cb};
}

async function
loadChrome() {
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
      '--autoplay-policy=no-user-gesture-required'
    ]
  });
}
