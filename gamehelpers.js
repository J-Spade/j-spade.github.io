// helper functions - should be usable from in-game

const g_forumOrigin = "https://forum.starmen.net";

var g_helloReceived = false;

var g_forumInfo = {
    badges: [],
    bgcolor: "rgb(0,0,0)",
    frameheight: 80,
    hiddenbadges: [],
    postid: "",
    username: "",
    userposted: false,
    weezer: false,
}

function sendHello() {
    parent.postMessage({message: "hello", content: null}, g_forumOrigin);
}

function helloReceived() {
    return g_helloReceived;
}

function getBadges() {
    return g_forumInfo.badges;
}

function getBgColor() {
    return g_forumInfo.bgcolor;
}

function getFrameHeight() {
    return g_forumInfo.frameheight;
}

function getHiddenBadges() {
    return g_forumInfo.hiddenbadges;
}

function getPostId() {
    return g_forumInfo.postid;
}

function getUserName() {
    return g_forumInfo.username;
}

function getWeezer() {
    return g_forumInfo.weezer;
}

function userPosted() {
    return g_forumInfo.userposted;
}

function insertPost() {
    parent.postMessage({message: "dummypost", content: null}, g_forumOrigin);
}

function deleteBadge(badgeName, hide = true) {
    var idx = g_forumInfo.badges.indexOf(badgeName);
    if (idx != -1) {
        g_forumInfo.badges.splice(idx, 1);
        // track hidden badges in case they need to be restored
        if (hide) {
            g_forumInfo.hiddenbadges.push(badgeName);
        }
        parent.postMessage({message: "delbadge", content: {name: badgeName, hide: hide}}, g_forumOrigin);
    }
}

function restoreBadges() {
    // unhides badges that were hidden - deletion is still permanent
    for (const hidden in g_forumInfo.hiddenbadges) {
        g_forumInfo.badges.push(hidden);
    }
    g_forumInfo.hiddenbadges = [];
    parent.postMessage({message: "restorebadges", content: null}, g_forumOrigin);
}

function setPostTextIndex(idx) {
    parent.postMessage({message: "settext", content: {index: idx}}, g_forumOrigin);
}

function setFrameSize(width, height) {
    parent.postMessage({message: "resize", content: {width: width, height: height}}, g_forumOrigin);
}

function shakeStart(intensity) {
    parent.postMessage({message: "shakestart", content: {intensity: intensity}}, g_forumOrigin);
}

function shakeStop() {
    parent.postMessage({message: "shakestop", content: null}, g_forumOrigin);
}

function registerListener() {
    window.addEventListener(
        "message",
        (event) => {
            // console.log(event)
            if (event.origin !== g_forumOrigin) return;
            try {
                // hello
                if (event.data.message == "hello") {
                    g_forumInfo = event.data.content;
                    g_helloReceived = true;
                }
            }
            catch (err) {
                // if we get here, there's a bug or someone is meddling with browser dev tools
                console.error(err);
            }
        },
        false,
    );
}