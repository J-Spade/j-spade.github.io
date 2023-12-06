
// utility

// possible text for the spoofed user post
// (hard-coded options for the game to select from)
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
    
    // find the latest post in the table
    const postList = recentsPage.getElementsByTagName("tr");  // rows in table
    if (postList.length <= 1) return null;  // first row is headers
    const threadURL = postList[1].getElementsByTagName("a")[0].href;
    recentsPage.remove();  // no longer needed

    // get the page containing the exemplar post
    const threadHTML = await fetchForumURL(threadURL);
    if (threadHTML == null) return null;
    const otherThread = document.createElement("html");
    otherThread.innerHTML = threadHTML;

    // find the user's post in the page
    let userPost = null;
    for (const post of otherThread.getElementsByClassName("post")) {
        const postProfile =  post.getElementsByClassName("member")[0];
        const profileParts = postProfile.getAttribute("href").split("/");
        const actualParts = profileURL.split("/");
        if (profileParts[profileParts.length - 1] == actualParts[actualParts.length - 1]) {
            userPost = post;
            break;
        }
    }
    if (userPost == null) return null;

    // pare things down to just the post element
    const postElement = document.createElement("div");
    postElement.innerHTML = userPost.innerHTML;
    otherThread.remove();

    return postElement;
}

async function insertUserPost() {
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

async function onLoadHandler() {
    registerListener();
    await insertUserPost();
}

// command handlers (same prototype for each)

function doHello(frame, messageContent) {
    const post = getPostElementOfFrame(frame);
    const postid = post.id;
    const bgcolor = getComputedStyle(post).backgroundColor;

    const profile = document.getElementById("profile");
    const username = profile !== null ? profile.innerText.trim() : null;

    const badgeElems = getUserBadges();

    const pageInfo = {
        badgecount: badgeElems.length,
        bgcolor: bgcolor,
        postid: postid,
        username: username,
    };
    return {message: "hello", content: pageInfo};
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

function registerListener() {
    window.addEventListener(
        "message",
        (event) => {
            // if (event.origin !== "https://forum.starmen.net/") return;
            console.log(event.data);
            
            // locate the iframe source
            let iframe = null;
            for (const f of document.getElementsByTagName("iframe")) {
                if (f.contentWindow == event.source) {
                    iframe = f;
                    break;
                }
            }
            if (iframe == null) return;

            // handle commands - each handler uses the same function prototype
            const messageTypes = {
                "hello": doHello,
                "resize": doResize,
                "delbadge": doDeleteBadge,
                "settext": doSetText,
            }
            for (const [cmd, func] of Object.entries(messageTypes)) {
                if (event.data.message == cmd) {
                    const response = func(iframe, event.data.content);
                    if (response !== null) {
                        event.source.postMessage(response, "*");
                    }
                }
            }
        },
        false,
    );
}

// TODO: would ideally like this to instead live in the `onload` attribute of the iframe tag
document.addEventListener("DOMContentLoaded", onLoadHandler);
