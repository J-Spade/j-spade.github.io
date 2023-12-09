//
// utility functions
//

// possible text for the spoofed user post
//   (hard-coded options for the game to select from)
const g_textOptions = [
    "<p> I can't wait! </p>",
    "<p> oh no </p>",
    "<p> :) </p>",
];

function getPostElementOfFrame(frame) {
    return frame.parentElement.parentElement.parentElement.parentElement; // gross, I know
}

async function fetchForumURL(url) {
    const response = await window.fetch(url);
    return response.text();
}

async function getPostByCurrentUser() {
    const profileElem = document.getElementById("profile");
    if (profileElem === null) return null;

    const parser = new DOMParser();

    // retrieve the latest post on the "see all messages by user" page
    const currentProfile = profileElem.getElementsByTagName("a")[0].href;
    const recentsHTML = await fetchForumURL(currentProfile + "/posts");
    if (recentsHTML == null) return null;

    const threadURL = parser
        .parseFromString(recentsHTML, "text/html")
        .getElementsByTagName("tr")[1]
        .getElementsByTagName("a")[0].href;
    const threadHTML = await fetchForumURL(threadURL);
    if (threadHTML == null) return null;

    const otherThread = parser.parseFromString(threadHTML, "text/html");

    // find the user's post in the thread page
    let userPost = null;
    for (const post of otherThread.getElementsByClassName("post")) {
        const profile = post.getElementsByClassName("member")[0].href;
        const name = profile.slice(profile.lastIndexOf("/"));
        if (currentProfile.endsWith(name)) {
            userPost = post;
            break;
        }
    }
    if (userPost == null) return null;

    // return the post element
    return userPost.cloneNode(true);
}

async function insertUserPost() {
    // ensure we haven't already done this
    if (document.getElementsByClassName("avsdoda").length > 0) return;

    // find an exemplar post by the logged-on user
    const post = await getPostByCurrentUser();
    if (post == null) return;

    // assign "post even" to the post - post is inserted right after the OP
    //   also assign "avsdoda" so it's faster/easier to find again
    post.classList.add("post", "even", "avsdoda");

    // replace the message-content with an initial value
    post.getElementsByClassName("message-content")[0].innerHTML = g_textOptions[0];

    // insert the faked user post as a reply to the OP
    const op = document.getElementsByClassName("post")[0];
    const inserted = op.parentElement.insertBefore(post, op.nextElementSibling);

    // fix even/odd colors
    let nextPost = inserted.nextElementSibling;
    while (nextPost !== null) {
        if (!nextPost.classList.replace("even", "odd")) {
            nextPost.classList.replace("odd", "even");
        }
        nextPost = nextPost.nextElementSibling;
    }

    return inserted;
}

function getInsertedUserPost() {
    // "avsdoda" tag was added to the inserted post
    const avsdodas = document.getElementsByClassName("avsdoda");
    if (avsdodas.length > 0) {
        return avsdodas[0];
    }
    return null;
}

function getUserBadges() {
    const userPost = getInsertedUserPost();
    if (userPost !== null) {
        return userPost.getElementsByClassName("badges")[0].children;
    }
    return [];
}

//
// command handlers
//
// each of these takes the iframe element and message content as arguments,
//   and returns the content to be sent back in response, if any
//

async function doHello(frame, messageContent) {
    await insertUserPost();

    const badgeElems = getUserBadges();
    const post = getPostElementOfFrame(frame);
    const profile = document.getElementById("profile");
    const username = profile !== null ? profile.innerText.trim() : null;

    const pageInfo = {
        badgecount: badgeElems.length,
        bgcolor: getComputedStyle(post).backgroundColor,
        postid: post.id,
        username: username,
    };
    return pageInfo;
}

async function doResize(frame, messageContent) {
    frame.width = messageContent.width;
    frame.height = messageContent.height;
}

async function doDeleteBadge(frame, messageContent) {
    const badgeElems = getUserBadges();
    if (badgeElems.length > 0) {
        badgeElems[Math.floor(Math.random() * badgeElems.length)].remove();
    }
}

async function doSetText(frame, messageContent) {
    const post = getInsertedUserPost();
    if (post !== null) {
        const idx = messageContent.index;
        if (idx < g_textOptions.length) {
            const content = post.getElementsByClassName("message-content")[0];
            content.innerHTML = g_textOptions[idx];
        }
    }
}

async function messageHandler(event) {
    // if (event.origin !== "https://forum.starmen.net/") return;
    console.log(event.data);

    // each command handler uses the same function prototype
    const messageTypes = {
        hello: doHello,
        resize: doResize,
        delbadge: doDeleteBadge,
        settext: doSetText,
    };

    // locate the iframe source
    for (const iframe of document.getElementsByTagName("iframe")) {
        if (iframe.contentWindow == event.source) {
            // call the command handler
            messageTypes[event.data.message](iframe, event.data.content)
                .then((response) => {
                    if (typeof response !== "undefined" && response !== null) {
                        // responses echo the command name that was sent
                        // TODO: fix the wildcard origin
                        event.source.postMessage({ message: event.data.message, content: response }, "*");
                    }
                });
            break;
        }
    }
}

async function registerListener() {
    window.addEventListener("message", (event) => messageHandler(event), false);
}

// TODO: would ideally like this to instead live in the `onload` attribute of the iframe tag
document.addEventListener("DOMContentLoaded", registerListener);
