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
    '-hide_banner', '-loglevel', 'error',
    // Input 0: Audio
    '-thread_queue_size',
    '1024',
    '-itsoffset',
    params.audioOffset,
    '-f',
    'pulse',
    '-i',
    params.outputName + '.monitor',

    '-acodec',
    'aac',
    // Video
    '-thread_queue_size', '1024',
    // framerate
    '-framerate', params.fps,
    // input
    '-i', '-', '-f', 'image2pipe',
    // video settings
    '-c:v', 'libx264', '-preset', 'veryFast', '-pix_fmt', 'yuvj420p',
    // video optimization
    '-me_method', 'epzs', '-g', '45', '-bf', '2', '-trellis',
    '2', '-cmp', '2', '-subcmp', '2',
    //
    // Output
    '-vb',
    '2500k',
    '-vf',
    'pp=al',
    '-r',
    params.fps,
    '-threads',
    '0',
    '-acodec', 'aac', '-strict', '-2', '-ab', '48k', '-ac', '2', '-ar', '44100',
    '-af', 'aresample=async=1',
    '-f', 'mp4', params.output,
  ];
}
