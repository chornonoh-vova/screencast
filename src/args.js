const logger = require('./logger');

var args = process.argv.slice(2);

function getUrl(){
  const url = args[0];
  logger.debug(`Working on url: ${url}`);
  if(url === undefined || url === ''){
    logger.error('Exiting, url is not defined in the params');
    process.exit(1);
  }
  return url;
}

exports.getUrl = getUrl;
