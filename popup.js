document.getElementById("sponsorStart").addEventListener("click", sendSponsorStartMessage);
document.getElementById("clearTimes").addEventListener("click", clearTimes);
document.getElementById("submitTimes").addEventListener("click", submitTimes);

//if true, the button now selects the end time
var startTimeChosen = false;

//the start and end time pairs (2d)
var sponsorTimes = [];

//current video ID of this tab
var currentVideoID = null;

//is this a YouTube tab?
var isYouTubeTab = false;

//if no response comes by this point, give up
setTimeout(function() {
  if (!isYouTubeTab) {
    document.getElementById("loadingIndicator").innerHTML = "This probably isn't a YouTube tab, or you clicked too early. " +
      "If you know this is a YouTube tab, close this popup and open it again.";
  }
}, 100);

chrome.tabs.query({
  active: true,
  currentWindow: true
}, loadTabData);

function loadTabData(tabs) {
  //set current videoID
  currentVideoID = getYouTubeVideoID(tabs[0].url);

  //load video times for this video 
  let sponsorTimeKey = "sponsorTimes" + currentVideoID;
  chrome.storage.local.get([sponsorTimeKey], function(result) {
    sponsorTimes = result[sponsorTimeKey];
    if (sponsorTimes != undefined && sponsorTimes != []) {
      if (sponsorTimes[sponsorTimes.length - 1]!= undefined && sponsorTimes[sponsorTimes.length - 1].length < 2) {
        startTimeChosen = true;
      }

      displaySponsorTimes();
    } else {
      sponsorTimes = []
    }
  });

  
  
  //check if this video's sponsors are known
  chrome.tabs.sendMessage(
    tabs[0].id,
    {from: 'popup', message: 'isInfoFound'},
    infoFound
  );
}

function infoFound(request) {
  //if request is undefined, then the page currently being browsed is not YouTube
  if (request != undefined) {
    //this must be a YouTube video
    //set variable
    isYouTubeTab = true;

    //remove loading text
    document.getElementById("mainControls").style.display = "unset"
    document.getElementById("loadingIndicator").innerHTML = "";

    if (request.found) {
      document.getElementById("videoFound").innerHTML = "This video's sponsors are in the database!"

      displayDownloadedSponsorTimes(request);
    } else {
      document.getElementById("videoFound").innerHTML = "No sponsors found"
    }
  }
}

function setVideoID(request) {
  //if request is undefined, then the page currently being browsed is not YouTube
  if (request != undefined) {
    videoID = request.videoID;
  }
}

function sendSponsorStartMessage() {
    //the content script will get the message if a YouTube page is open
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, tabs => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {from: 'popup', message: 'sponsorStart'}
      );
    });
}

chrome.runtime.onMessage.addListener(function (request, sender, callback) {
  if (request.message == "time") {
    let sponsorTimesIndex = sponsorTimes.length - (startTimeChosen ? 1 : 0);

    if (sponsorTimes[sponsorTimesIndex] == undefined) {
      sponsorTimes[sponsorTimesIndex] = [];
    }

    sponsorTimes[sponsorTimesIndex][startTimeChosen ? 1 : 0] = request.time;

    let sponsorTimeKey = "sponsorTimes" + currentVideoID;
    chrome.storage.local.set({[sponsorTimeKey]: sponsorTimes});

    //update startTimeChosen variable
    if (!startTimeChosen) {
      startTimeChosen = true;
      document.getElementById("sponsorStart").innerHTML = "Sponsorship Ends";
    } else {
      startTimeChosen = false;
      document.getElementById("sponsorStart").innerHTML = "Sponsorship Start";
    }

    //display video times on screen
    displaySponsorTimes();
  }
});

//display the video times from the array
function displaySponsorTimes() {
  //set it to the message
  document.getElementById("sponsorMessageTimes").innerHTML = getSponsorTimesMessage(sponsorTimes);
}

//display the video times from the array at the top, in a different section
function displayDownloadedSponsorTimes(request) {
  if (request.sponsorTimes != undefined) {
    //set it to the message
    document.getElementById("downloadedSponsorMessageTimes").innerHTML = getSponsorTimesMessage(request.sponsorTimes);
  }
}

//get the message that visually displays the video times
function getSponsorTimesMessage(sponsorTimes) {
  let sponsorTimesMessage = "";

  for (let i = 0; i < sponsorTimes.length; i++) {
    for (let s = 0; s < sponsorTimes[i].length; s++) {
      let timeMessage = getFormattedTime(sponsorTimes[i][s]);
      //if this is an end time
      if (s == 1) {
        timeMessage = " to " + timeMessage;
      } else if (i > 0) {
        //add commas if necessary
        timeMessage = ", " + timeMessage;
      }

      sponsorTimesMessage += timeMessage;
    }
  }

  return sponsorTimesMessage;
}

function clearTimes() {
  sponsorTimes = [];

  let sponsorTimeKey = "sponsorTimes" + currentVideoID;
  chrome.storage.local.set({[sponsorTimeKey]: sponsorTimes});

  displaySponsorTimes();
}

function submitTimes() {
  chrome.runtime.sendMessage({
    message: "submitTimes",
    videoID: currentVideoID
  }, function(request) {
    clearTimes();
  });
}

//converts time in seconds to minutes:seconds
function getFormattedTime(seconds) {
  let minutes = Math.floor(seconds / 60);
  let secondsDisplay = Math.round(seconds - minutes * 60);
  let formatted = minutes+ ":" + secondsDisplay;

  return formatted;
}

function getYouTubeVideoID(url) { // Return video id or false
  var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
  var match = url.match(regExp);
  return (match && match[7].length == 11) ? match[7] : false;
}