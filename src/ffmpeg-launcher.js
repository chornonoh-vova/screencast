/* eslint-disable require-jsdoc */
const spawn = require('child_process').spawn;
const logger = require('./logger');

let ffmpeg = null;
let restart = false;
const restartParams = null;

function closeAll() {
  logger.debug('Closing all');
  if (restart) {
    logger.debug('Starting ffmpeg again');
    restart = false;
    ffmpeg = start(restartParams);
    restartParams.callback(ffmpeg);
  }
}

const start = (exports.start = function(params) {
  logger.debug(`Initializing ffmpeg, fps: ${params.fps}`);

  const opts = ffmpegOpts(params);
  ffmpeg = spawn('ffmpeg', opts, {stdio: ['pipe', 'pipe', 2], detached: true});

  ffmpeg.on('error', (e) => {
    logger.error(e);
    closeAll();
  });

  ffmpeg.on('close', (code, signal) => {
    logger.error(`Terminating due to receiving signal ${signal}`);
    closeAll();
  });

  logger.debug(`child process started on ${ffmpeg.pid}`);
  return ffmpeg;
});

function ffmpegOpts(params) {
  return [
    // Common
    // '-hide_banner', '-loglevel', 'error',
    // Input 0: Audio
    '-thread_queue_size', '4096',
    '-itsoffset', params.audioOffset,
    '-f', 'pulse',
    '-i', params.outputName + '.monitor', '-acodec', 'libopus',
    // Video
    '-thread_queue_size', '2048',
    // framerate
    '-framerate', params.fps,
    // input
    '-i', '-', '-f', 'image2pipe',
    // video settings
    // for mp4
    'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuvj420p',
    '-movflags', '+faststart',
    // video optimization
    '-me_method', 'hex', '-threads', '5',
    //
    // Output
    '-vb',
    '2500k',
    '-vf',
    'pp=al',
    '-r', params.fps,
    '-threads', '5',
    '-f', 'mp4', params.output,
  ];
}
