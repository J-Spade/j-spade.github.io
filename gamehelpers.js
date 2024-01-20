// helper functions - should be usable from in-game

const g_forumOrigin = "https://forum.starmen.net";

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
    parent.postMessage({message: "hello", content: null}, g_forumOrigin);
}

function insertPost() {
    parent.postMessage({message: "dummypost", content: null}, g_forumOrigin);
}

function deleteBadge(badgeName) {
    var idx = g_forumInfo.badges.indexOf(badgeName);
    if (idx != -1) {
        g_forumInfo.badges.splice(idx, 1);
        parent.postMessage({message: "delbadge", content: {name: badgeName}}, g_forumOrigin);
    }
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
            // TODO: comment out logging
            console.log(event)
            if (event.origin !== g_forumOrigin) return;

            // hello
            if (event.data.message == "hello") {
                g_forumInfo = event.data.content;
                g_helloReceived = true;
            }
        },
        false,
    );
}