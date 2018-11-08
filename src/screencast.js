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
// const ffmpegLauncher = require('./ffmpeg-launcher');

var queue, chrome, Page, Runtime, ffmpeg;
var lastRestartDateTime = 0;

exports.start = async function() {
    logger.debug(`Process PID: ${process.pid}`);

    chrome = await loadChrome();
    logger.debug(`Chrome PID: ${chrome.pid}`);

    // Remote interface
    const remoteInterface = initRemoteInterface(chrome);
    // Listener for new frame
    // remoteInterface.on()

    Page = remoteInterface.Page;
    Runtime = remoteInterface.Runtime;

    // Initialization of page and runtime
    await Promise.all([Page.enable(), Runtime.enable()]);

    Page.screencastFrame = onScreencastFrame;

    // Loading page
    await loadPage(args.getUrl());

    // Wait for page loading
    await Page.loadEventFired(async () => {
        logger.debug('Page.loadEventFired');

    });
};

function onScreencastFrame(event) {

}

async function loadPage(url) {
    logger.debug(`Loading page: ${url}`);
    await Page.navigate({url: url});
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
            '--window-size=1280,720',
            '--headless',
            '--disable-gpu',
            '--autoplay-policy=no-user-gesture-required'
        ]
    });
}
