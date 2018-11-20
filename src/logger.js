const {format, createLogger, transports} = require('winston');

const logger = createLogger({
  format: format.combine(
      format.colorize(),
      format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
      format.printf(
          (info) => `[${info.timestamp}][${info.level}]: ${info.message}`)),
  transports: [new transports.Console({level: 'debug'})],
});

module.exports = logger;
