const fs = require('fs');
// Needed to start chrome
const chromeLauncher = require('chrome-launcher');
// Needed to send commands to chrome
const chromeRemoteInterface = require('chrome-remote-interface');

pageUrl = 'https://www.youtube.com/watch?v=0I647GU3Jsc';
fileOutputName = 'output.mp4';
pageWidth = 1400;
pageHeight = 900;

(async function() {

  const chrome = await launchChrome();
  const protocol = await chromeRemoteInterface({port: chrome.port});

  const {Target} = protocol;
  Target.createBrowserContext().then(ids => console.log(ids)).catch(e => console.error(e));
  const target = await Target.createTarget({
    url: pageUrl,
    width: pageWidth,
    height: pageHeight,
    browserContextId: '0',
    enableBeginFrameControl: true
  });
  console.log(target.targetId);

  Page.loadEventFired(async () => {
    start();
    const data = await HeadlessExperimental.beginFrame();
    fs.writeFileSync('screenshot.png', Buffer.from(data.screenshotData, 'base64'));
    console.log(data);

    process.on('exit', function(code) {
      protocol.close();
      chrome.kill();
    });
  });

})();

var startTime, endTime;

function start() {
  startTime = new Date();
};

function end() {
  endTime = new Date();
  var timeDiff = endTime - startTime; //in ms
  console.log(timeDiff + " ms");
}

function launchChrome() {
  return chromeLauncher.launch({
    chromeFlags: [
      // Setting up virtual windows size
      `--window-size=${pageWidth},${pageHeight}`,
      // Mandatory parameters
      '--headless',  // '--disable-gpu',
      // Fixes issue, when no sandbox is avalaible
      '--no-sandbox',
      // Fixes issue, when user must press play on page
      '--autoplay-policy=no-user-gesture-required',
      pageUrl,
    ],
  });
}