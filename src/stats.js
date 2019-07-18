const logger = require('./logger');

module.exports = function() {
  this.streamStats = {
    second: Math.floor(new Date().getTime() / 1000),
    totalSeconds: 0,
    framesPerSecond: 0,
    totalFramesForFPS: 0,
    currentFPS: 20,
    framesDeltaForFPS: 0,
    lastKnownDelta: 0,

    // Smoothing algo vars
    firstFrameTime: 0,
    lastFrameReceivedTime: 0,
    currentElapsedTime: 0,
    idealTotalFrames: 0,
    totalFramesReceived: 0,
    totalFramesAdded: 0,
    ffmpegReady: false,
  };

  this.getStats = this.streamStats;

  this.track = (event) => {
    const now = new Date().getTime();
    this.streamStats.lastFrameReceivedTime = now;
    const nowInSecond = Math.floor(now / 1000);

    // This will happen only once every second
    if (this.streamStats.second != nowInSecond) {
      if (this.streamStats.totalSeconds > 0) {
        this.streamStats.framesDeltaForFPS =
            this.streamStats.framesReceivedPerSecond -
            this.streamStats.currentFPS;
        logger.debug(
            'Second: ' + this.streamStats.second + ' received ' +
            this.streamStats.framesReceivedPerSecond + '/' +
            this.streamStats.currentFPS +
            '. Delta: ' + this.streamStats.framesDeltaForFPS +
            '. Sent to FFMPEG: ' + this.streamStats.totalFramesAddedPerSecond);
        logger.debug(
            'Total Frames Received: ' + this.streamStats.totalFramesReceived +
            ' . Total Time Elapsed: ' + this.streamStats.currentElapsedTime +
            ' . Ideal Total Frames: ' + this.streamStats.idealTotalFrames +
            ' . Current Frames Added: ' + this.streamStats.totalFramesAdded);
      }
      this.streamStats.totalSeconds++;
      this.streamStats.second = nowInSecond;
      this.streamStats.framesReceivedPerSecond = 0;
      this.streamStats.totalFramesAddedPerSecond = 0;
    }

    this.streamStats.framesReceivedPerSecond++;

    // calculate frames to add now only start adding when we know
    // we are read
    if (this.streamStats.ffmpegReady) {
      // adjust first time
      if (this.streamStats.firstFrameTime == 0) {
        this.streamStats.firstFrameTime = now;
      }

      this.streamStats.totalFramesReceived++;
      this.streamStats.idealFrameDistance = 1000 / this.streamStats.currentFPS;
      this.streamStats.currentElapsedTime =
          now - this.streamStats.firstFrameTime;
      this.streamStats.idealTotalFrames =
          Math.floor(
              this.streamStats.currentElapsedTime /
              this.streamStats.idealFrameDistance) +
          1;
      this.streamStats.framesToAddNow =
          this.streamStats.idealTotalFrames - this.streamStats.totalFramesAdded;
    }
  };

  this.frameAdded = () => {
    if (this.streamStats.firstFrameTime == 0) {
      this.streamStats.firstFrameTime = this.streamStats.lastFrameReceivedTime;
    }
    this.streamStats.totalFramesAddedPerSecond++;
    this.streamStats.totalFramesAdded++;
    this.streamStats.framesToAddNow--;
    // console.log('remaining:' + this.streamStats.framesToAddNow);
  };

  this.resetSmoothingAlgoStats = () => {
    this.streamStats.firstFrameTime = 0;
    this.streamStats.lastFrameReceivedTime = 0;
    this.streamStats.currentElapsedTime = 0;
    this.streamStats.idealTotalFrames = 0;
    this.streamStats.totalFramesReceived = 0;
    this.streamStats.totalFramesAdded = 0;
    this.streamStats.ffmpegReady = false;
  };
};
