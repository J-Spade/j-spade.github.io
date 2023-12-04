// helper functions - should be usable from in-game

var g_forumInfo = {
    badgecount: 0,
    bgcolor: "rgb(0,0,0)",
    postid: "",
    username: "",
}

function sendHello() {
    // TODO: fix the wildcard origin
    parent.postMessage({message: "hello", content: null}, "*");
}

function getBadges() {
    return g_forumInfo.badgecount;
}

function getBgColor() {
    return g_forumInfo.bgcolor;
}

function getPostId() {
    return g_forumInfo.postid;
}

function getUserName() {
    return g_forumInfo.username;
}

function setFrameSize(width, height) {
    // TODO: fix the wildcard origin
    parent.postMessage({message: "resize", content: {width: width, height: height}}, "*");
}

function setPostContent(html) {
    // TODO: fix the wildcard origin
    parent.postMessage({message: "editpost", content: {html: html}}, "*");
}

function registerListener() {
    window.addEventListener(
        "message",
        (event) => {
            // if (event.origin !== "https://forum.starmen.net/") return;
            console.log(event.data);

            // hello
            if (event.data.message == "hello") {
                g_forumInfo = event.data.content
            }
        },
        false,
    );
}