const logger = require('./logger');

const args = process.argv.slice(2);

function getUrl() {
  const url = args[0];
  logger.debug(`Recording url: ${url}`);
  if (url === undefined || url === '') {
    logger.error('Exiting, url is not defined in the params');
    process.exit(1);
  }
  return url;
}

exports.getUrl = getUrl;

function getOutputName() {
  const outputName = args[1] || 'output.mp4';
  logger.debug(`File output name is: ${outputName}`);
  return outputName;
}

exports.getOutputName = getOutputName;
