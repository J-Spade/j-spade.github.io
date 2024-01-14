// helper functions - should be usable from in-game

var g_helloReceived = false;

var g_forumInfo = {
    badges: [],
    bgcolor: "rgb(0,0,0)",
    frameheight: 80,
    postid: "",
    username: "",
    weezer: false,
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

function getPostId() {
    return g_forumInfo.postid;
}

function getUserName() {
    return g_forumInfo.username;
}

function getWeezer() {
    return g_forumInfo.weezer;
}

function sendHello() {
    // TODO: fix the wildcard origin
    parent.postMessage({message: "hello", content: null}, "*");
}

function insertPost() {
    // TODO: fix the wildcard origin
    parent.postMessage({message: "dummypost", content: null}, "*");
}

function deleteBadge(badgeName) {
    var idx = g_forumInfo.badges.indexOf(badgeName);
    if (idx != -1) {
        g_forumInfo.badges.splice(idx, 1);
        // TODO: fix the wildcard origin
        parent.postMessage({message: "delbadge", content: {name: badgeName}}, "*");
    }
}

function setPostTextIndex(idx) {
    // TODO: fix the wildcard origin
    parent.postMessage({message: "settext", content: {index: idx}}, "*");
}

function setFrameSize(width, height) {
    // TODO: fix the wildcard origin
    parent.postMessage({message: "resize", content: {width: width, height: height}}, "*");
}

function shakeStart(intensity) {
    // TODO: fix the wildcard origin
    parent.postMessage({message: "shakestart", content: {intensity: intensity}}, "*");
}

function shakeStop() {
    // TODO: fix the wildcard origin
    parent.postMessage({message: "shakestop", content: null}, "*");
}

function registerListener() {
    window.addEventListener(
        "message",
        (event) => {
            // if (event.origin !== "https://forum.starmen.net/") return;
            console.log(event.data);

            // hello
            if (event.data.message == "hello") {
                g_forumInfo = event.data.content;
                g_helloReceived = true;
            }
        },
        false,
    );
}