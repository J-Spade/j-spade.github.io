
//
// utility functions
//

// possible text for the spoofed user post
//   (hard-coded options for the game to select from)
const g_textOptions = [
    "<p> I can't wait! </p>",
    "<p> oh no </p>",
    "<p> :) </p>",
]

function getPostElementOfFrame(frame) {
    return frame.parentElement.parentElement.parentElement.parentElement;  // gross, I know
}

async function fetchForumURL(url) {
    const response = await window.fetch(url);
    return response.text();
}

async function getPostByCurrentUser() {
    const profileElem = document.getElementById("profile");
    if (profileElem === null) return null;

    // construct the "see all messages by user" URL
    const profileURL = profileElem.getElementsByTagName("a")[0].href;
    const postsURL = profileURL + "/posts";

    // get the recent posts page
    const recentsHTML = await fetchForumURL(postsURL);
    if (recentsHTML == null) return null;
    const recentsPage = document.createElement("html");
    recentsPage.innerHTML = recentsHTML;
    
    // find the latest post in the table that ~isn't~ already on this page
    let threadURL = null;
    let postList = Array.from(recentsPage.getElementsByTagName("tr"));
    postList.shift();  // skip the table header row
    for (const post of postList) {
        const url = post.getElementsByTagName("a")[0].href
        const urlParts = url.split("/");
        const postId = "post" + urlParts[urlParts.length - 1];
        if (document.getElementsByClassName(postId).length == 0) {
            threadURL = url;
            break;
        }
    }
    recentsPage.remove();  // no longer needed
    if (threadURL == null) return null;

    // get the page containing the exemplar post
    const threadHTML = await fetchForumURL(threadURL);
    if (threadHTML == null) return null;
    const otherThread = document.createElement("html");
    otherThread.innerHTML = threadHTML;

    // find the user's post in the page
    let userPost = null;
    for (const post of otherThread.getElementsByClassName("post")) {
        const postProfile =  post.getElementsByClassName("member")[0];
        const profileParts = postProfile.href.split("/");
        const actualParts = profileURL.split("/");
        if (profileParts[profileParts.length - 1] == actualParts[actualParts.length - 1]) {
            userPost = post;
            break;
        }
    }
    if (userPost == null) return null;

    const postElement = userPost.cloneNode(true);
    otherThread.remove();  // no longer needed

    return postElement;
}

async function insertUserPost() {
    // ensure we haven't already done this
    if (document.getElementsByClassName("avsdoda").length > 0) return;
  
    // find an exemplar post by the logged-on user
    const post = await getPostByCurrentUser();
    if (post == null) return;

    // assign "post even" classes to the post
    // (we're assuming this is being inserted right after the OP)
    post.classList.add("post");
    post.classList.add("even");

    // assign "avsdoda" class to the post so it's faster/easier to find again
    post.classList.add("avsdoda");

    // replace the message-content with an initial value
    const content = post.getElementsByClassName("message-content")[0];
    content.innerHTML = g_textOptions[0];

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
    if (avsdodas.length > 0)
    {
        return avsdodas[0];
    }
    return null;
}

function getUserBadges() {
    const userPost = getInsertedUserPost();
    if (userPost !== null)
    {
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
// handlers can be async; the main listener will await promise results
//

async function doHello(frame, messageContent) {
    // construct the forum info blob
    const post = getPostElementOfFrame(frame);
    const postid = post.id;
    const bgcolor = getComputedStyle(post).backgroundColor;

    const profile = document.getElementById("profile");
    const username = profile !== null ? profile.innerText.trim() : null;

    // insert a fake post by the user and read badge info out of it
    await insertUserPost()
    const badgeElems = getUserBadges();

    const pageInfo = {
        badgecount: badgeElems.length,
        bgcolor: bgcolor,
        postid: postid,
        username: username,
    };
    return pageInfo;
}

function doResize(frame, messageContent) {
    frame.width = messageContent.width;
    frame.height = messageContent.height;
    return null;  // no response
}

function doDeleteBadge(frame, messageContent) {
    const badgeElems = getUserBadges();
    if (badgeElems.length > 0)
    {
        badgeElems[Math.floor(Math.random() * badgeElems.length)].remove();
    }
    return null;  // no response
}

function doSetText(frame, messageContent) {
    const post = getInsertedUserPost();
    if (post !== null)
    {
        const idx = messageContent.index;
        if (idx < g_textOptions.length)
        {
            const content = post.getElementsByClassName("message-content")[0];
            content.innerHTML = g_textOptions[idx];
        }
    }
    return null;  // no response
}

async function messageHandler(event) {
    // if (event.origin !== "https://forum.starmen.net/") return;
    console.log(event.data);

    // each command handler uses the same function prototype
    const messageTypes = {
        "hello": doHello,
        "resize": doResize,
        "delbadge": doDeleteBadge,
        "settext": doSetText,
    }

    // locate the iframe source
    for (const iframe of document.getElementsByTagName("iframe")) {
        if (iframe.contentWindow == event.source) {
            // call the command handler
            messageTypes[event.data.message](iframe, event.data.content).then((response) => {
                if (response !== null) {
                    // responses echo the command name that was sent
                    event.source.postMessage({message: event.data.message, content: response}, "*");
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
