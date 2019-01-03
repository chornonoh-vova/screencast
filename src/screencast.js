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
const Stats = require('./stats');
const audio = require('./audio');

const {scriptsPath} = require('./utils');

class ScreenCast {
  constructor() {
    this.audioDevice = 'audio-source-';
    this.started = false;
    this.chrome = null;
    this.Page = null;
    this.ffmpeg = null;
    this.pageUrl = null;
    this.fileOutputName = null;
    this.pageHeight = null;
    this.pageWidth = null;
    this.remoteInterface = null;
    this.stats = new Stats();
  }

  async start(url, outputName, width, height) {
    // checking arguments
    this.pageUrl = url || args.getUrl();
    this.fileOutputName = outputName || args.getOutputName();
    this.pageWidth = width || '1280';
    this.pageHeight = height || '720';

    logger.debug(`Process PID: ${process.pid}`);

    this.chrome = await this.loadChrome();
    logger.debug(`Chrome PID: ${this.chrome.pid}`);
    this.audioDevice += this.chrome.pid;

    const sinkId = await this.initPulseAudio();

    // Remote interface
    this.remoteInterface = await this.initRemoteInterface(this.chrome);

    this.Page = this.remoteInterface.Page;
    this.Runtime = this.remoteInterface.Runtime;

    // Initialization of page and runtime
    await Promise.all([this.Page.enable(), this.Runtime.enable()]);

    // Page.screencastFrame = onScreencastFrame;

    // Loading page
    // await this.loadPage(this.pageUrl);

    // Wait for page loading
    await this.Page.loadEventFired(async() => {
      logger.debug('Page.loadEventFired');
      this.started = true;
      await this.afterPageLoaded(this.chrome, sinkId);
    });
  }

  async stop() {
    // this.ffmpeg.stdin.pause();
    this.chrome.kill();
    this.ffmpeg.kill();
    this.started = false;
    // cleaning up virtual audio modules after end of screencast
    await execAsync(
        `pactl unload-module $(pactl list | ` +
        `grep -A5 'Name: ${this.audioDevice}.monitor' | ` +
        `grep 'Owner Module:' | awk '{print $3}')`);
  }

  isStarted() { return this.started; }

  async initPulseAudio() {
    try {
      // Start pulseaudio
      await execAsync(`${scriptsPath}start_pulseaudio.sh`);
      // Set Default Sink
      await audio.setDefaultSink();

      // Create a new audio sink for this stream
      return await audio.createSink(this.audioDevice);
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  onScreencastFrame(event) {
    // this.Page.screencastFrameAck({sessionId: event.sessionId}).catch((err) => {
    //   logger.error(err);
    // });

    this.stats.track(event);
    if (this.ffmpeg == null) {
      return;
    }

    if (this.ffmpeg && this.ffmpeg.stdin) {
      this.stats.getStats.ffmpegReady = true;
      const lastImage = Buffer.from(event.data, 'base64');

      while (this.stats.getStats.framesToAddNow > 0) {
        this.ffmpeg.stdin.write(lastImage);
        this.stats.getStats.framesDeltaForFPS++;
        this.stats.frameAdded();
      }
    }
  }

  async afterPageLoaded(chrome, sinkId) {
    // Waiting for pulseaudio initialization
    await execAsync('sleep 2');
    // Get input id
    const inputIdList = await audio.getInputId(chrome.pid);

    for (let i = 0; i < inputIdList.length; i++) {
      const inputId = inputIdList[i];
      // Move input to its corresponding sink
      await audio.moveInput(inputId, sinkId);
    }
    const params = ffmpegProcessParams(
        this.stats.getStats.currentFPS, 0, this.audioDevice,
        this.fileOutputName, null);
    this.ffmpeg = ffmpegLauncher.start(params);

    await this.startCapturingFrames();
  }


  async loadPage(url) {
    logger.debug(`Loading page: ${url}`);
    await this.Page.navigate({url: url});
  }

  startCapturingFrames() {
    // Listener for new frame
    this.remoteInterface.on(
        'Page.screencastFrame', (event) => { this.onScreencastFrame(event); });
    logger.debug('Starting capturing screen frames..');
    return this.Page.startScreencast({format: 'jpeg', quality: 50});
  }

  async loadChrome() {
    try {
      logger.debug('Launching Chrome');
      return await this.launchChrome();
    } catch (error) {
      logger.error(`Failed to load Chrome: ${error}`);
      process.exit(1);
    }
  }

  initRemoteInterface(chrome) {
    const port = this.chrome.port;
    logger.debug(`Initialising remote interface on port: ${port}`);
    return chromeRemoteInterface({port: port});
  }

  // Helper for chrome launching
  launchChrome() {
    return chromeLauncher.launch({
      chromeFlags: [
        // Usefull flags
        '--enable-automation',
        '--disable-background-timer-throttling',
        '--run-all-compositor-stages-before-draw',
        '--disable-new-content-rendering-timeout',
        '--enable-features=SurfaceSynchronization',
        '--disable-threaded-animation',
        '--disable-threaded-scrolling',
        '--disable-checker-imaging',
        '--disable-image-animation-resync',
        // Setting up virtual windows size
        `--window-size=${this.pageWidth},${this.pageHeight}`,
        // Mandatory parameters
        '--headless',  // '--disable-gpu',
        // Fixes issue, when no sandbox is avalaible
        '--no-sandbox',
        // Fixes issue, when user must press play on page
        '--autoplay-policy=no-user-gesture-required',
      ],
      startingUrl: this.pageUrl,
    });
  }
}

function ffmpegProcessParams(f, af, on, o, cb) {
  return {fps: f, audioOffset: af, outputName: on, output: o, callback: cb};
}

module.exports.ScreenCast = ScreenCast;
