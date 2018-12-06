const execAsync = require('async-child-process').execAsync;
const logger = require('./logger');

const {scriptsPath} = require('./utils');

const createSink = exports.createSink = async function(sinkName) {
  let sinkId = await readSinkId(sinkName);

  if (sinkId) {
    logger.debug(`Existing Sink id: ${sinkId}`);
    return sinkId;
  }
  await execAsync(
      `pactl load-module module-null-sink sink_name=${sinkName} ` +
      ` sink_properties=device.description=${sinkName}`);

  sinkId = await readSinkId(sinkName);
  logger.debug(`New Sink id: ${sinkId}`);
  return sinkId;
};

// eslint-disable-next-line no-unused-vars
const setDefaultSink = exports.setDefaultSink = async function() {
  logger.debug('Setting default sink to \'Default\'');
  const defaultSink = 'Default';
  const defaultSource = defaultSink + '.monitor';
  await createSink(defaultSink);
  await execAsync(`pacmd set-default-sink ${defaultSink}`);
  const {stdout} = await execAsync(`pacmd set-default-source ${defaultSource}`);
  const setDefaultOutput = stdout.trim();
  return setDefaultOutput;
};

const readSinkId = exports.readSinkId = async function(sinkName) {
  const {stdout} =
      await execAsync(`pactl list short sinks | grep ${sinkName} | cut -f1`);
  const sinkId = stdout.trim();
  return sinkId;
};

// eslint-disable-next-line no-unused-vars
const getInputId = exports.getInputId = async function(chromePid) {
  const {stdout} = await execAsync(
      `${scriptsPath}get_input_index.sh ${chromePid}`);
  const inputIdList = stdout.trim().split(' ');
  logger.debug('Input id: ' + inputIdList);
  return inputIdList;
};

// eslint-disable-next-line no-unused-vars
const moveInput = exports.moveInput = async function(inputId, sinkId) {
  logger.debug(`Moving Input id: ${inputId} to Sink id: ${sinkId}`);
  const {stdout} =
      await execAsync(`pacmd move-sink-input ${inputId} ${sinkId}`);
  const output = stdout.trim();
  return output;
};
