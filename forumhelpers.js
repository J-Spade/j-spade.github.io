//
// utility functions
//

// the spoofed user post element
let g_spoofedPost = null;

// all of the user's posts on the current page
let g_userPosts = [];

// possible text for the spoofed user post
const g_textOptions = [
    "<p> I can't wait! </p>",
    "<p> oh no </p>",
    "<p> :) </p>",
];

// CSS defining a "shake" animation
//   idea shamelessly stolen from https://stackoverflow.com/questions/73537320/
// TODO: tweak parameters
const g_shakeAnimation_1 = `
@keyframes shake {
    0% { transform: translate(1px, 1px) rotate(0deg); }
    10% { transform: translate(-1px, -2px) rotate(-1deg); }
    20% { transform: translate(-3px, 0px) rotate(1deg); }
    30% { transform: translate(3px, 2px) rotate(0deg); }
    40% { transform: translate(1px, -1px) rotate(1deg); }
    50% { transform: translate(-1px, 2px) rotate(-1deg); }
    60% { transform: translate(-3px, 1px) rotate(0deg); }
    70% { transform: translate(3px, 1px) rotate(-1deg); }
    80% { transform: translate(-1px, -1px) rotate(1deg); }
    90% { transform: translate(1px, 2px) rotate(0deg); }
    100% { transform: translate(1px, -2px) rotate(-1deg); }
}
.shake {
    animation: shake 0.5s;
    animation-iteration-count: infinite;
}
`
const g_shakeAnimation_2 = `
@keyframes shake {
    0% { transform: translate(1px, 1px) rotate(0deg); }
    10% { transform: translate(-1px, -3px) rotate(-0.25deg); }
    20% { transform: translate(-4px, 0px) rotate(0.25deg); }
    30% { transform: translate(4px, 3px) rotate(0deg); }
    40% { transform: translate(1px, -1px) rotate(0.25deg); }
    50% { transform: translate(-1px, 3px) rotate(-0.25deg); }
    60% { transform: translate(-4px, 1px) rotate(0deg); }
    70% { transform: translate(4px, 1px) rotate(-0.25deg); }
    80% { transform: translate(-1px, -1px) rotate(0.25deg); }
    90% { transform: translate(1px, 3px) rotate(0deg); }
    100% { transform: translate(1px, -3px) rotate(-0.25deg); }
}
.shake {
    animation: shake 0.5s;
    animation-iteration-count: infinite;
}
`

async function fetchForumURL(url) {
    const response = await fetch(url);
    return response.text();
}

async function fetchLastPostByUser(profileURL) {
    const recentsHTML = await fetchForumURL(profileURL + "/posts");
    if (recentsHTML !== null) {
        const parser = new DOMParser();
        const threadURL = parser
            .parseFromString(recentsHTML, "text/html")
            .getElementsByTagName("tr")[1]
            .getElementsByTagName("a")[0].href;
        const threadHTML = await fetchForumURL(threadURL);

        if (threadHTML !== null) {
            // find the user's post in the thread page
            const otherThread = parser.parseFromString(threadHTML, "text/html");
            for (const post of otherThread.getElementsByClassName("post")) {
                const profile = post.getElementsByClassName("member")[0].href;
                const name = profile.slice(profile.lastIndexOf("/"));
                if (profileURL.endsWith(name)) {
                    return post.cloneNode(true);
                }
            }
        }
    }
    return null;
}

async function findPostsByCurrentUser() {
    const profileElem = document.getElementById("profile");
    if (profileElem !== null) {
        const currentProfile = profileElem.getElementsByTagName("a")[0].href;

        g_userPosts = [];
        for (const post of document.getElementsByClassName("post")) {
            const otherProfile = post.getElementsByClassName("member")[0].href;
            if (otherProfile == currentProfile) {
                g_userPosts.push(post);
            }
        }
        // if the user has no posts on this page, we have to find an exemplar
        //   quick-reply is technically a post element, so ignore it here
        if (g_userPosts.length == 0 || g_userPosts[0].classList.contains("quick")) {
            const newPost = await fetchLastPostByUser(currentProfile);
            if (newPost !== null) {
                g_spoofedPost = newPost;
            }
        }
        // otherwise just clone the first post we found
        else {
            g_spoofedPost = g_userPosts[0].cloneNode(true);
        }
    }
}

function getUserBadges() {
    let badges = []
    if (g_spoofedPost !== null) {
        for (const badge of g_spoofedPost.getElementsByClassName("badges")[0].children) {
            const src = badge.getElementsByTagName("img")[0].src;
            badges.push(src.split("/").reverse()[0]);
        }
    }
    return badges;
}

//
// command handlers
//
// each of these takes the iframe element and message content as arguments,
//   and returns the content to be sent back in response, if any
//

async function doHello(frame, messageContent) {
    // inject shake animation CSS as a <style> tag
    const style = document.createElement("style");
    style.innerHTML = g_shakeAnimation_2;
    document.head.appendChild(style);

    await findPostsByCurrentUser();

    const badges = getUserBadges();
    const post = frame.parentElement.parentElement.parentElement.parentElement; // gross, I know
    const profile = document.getElementById("profile");
    const username = profile !== null ? profile.innerText.trim() : null;

    const pageInfo = {
        badges: badges,
        bgcolor: getComputedStyle(post).backgroundColor,
        frameheight: frame.height,
        postid: post.id,
        username: username,
        weezer: badges.includes("Weezerfestbadge.png"),
    };
    return pageInfo;
}

async function doResize(frame, messageContent) {
    frame.width = messageContent.width;
    frame.height = messageContent.height;
}

async function doDeleteBadge(frame, messageContent) {
    for (const post of g_userPosts) {
        for (let badge of post.getElementsByClassName("badges")[0].children) {
            const src = badge.getElementsByTagName("img")[0].src;
            if (src.endsWith(messageContent.name)) {
                badge.remove();
                break;
            }
        }
    }
}

async function doDummyPost(frame, messageContent) {
    if (g_spoofedPost !== null)
    {
        // ensure we haven't already done this
        if (document.getElementsByClassName("avsdoda").length > 0) return;

        // assign "post even" to the post - post is inserted right after the OP
        //   also assign "avsdoda" so it's faster/easier to find again
        g_spoofedPost.classList.add("post", "even", "avsdoda");

        // replace the message-content with an initial value
        g_spoofedPost.getElementsByClassName("message-content")[0].innerHTML = g_textOptions[0];

        // strip the links out of the edit/quote/report/etc buttons
        const utils = g_spoofedPost.getElementsByClassName("utils")[0];
        for (const elem of utils.getElementsByTagName("a")) {
            elem.href = "#";
        }

        // insert the faked user post as a reply to the OP
        const op = document.getElementsByClassName("post")[0];
        const inserted = op.parentElement.insertBefore(g_spoofedPost, op.nextElementSibling);
        g_userPosts.splice(0, 0, g_spoofedPost);

        // fix even/odd colors
        let nextPost = inserted.nextElementSibling;
        while (nextPost !== null) {
            if (!nextPost.classList.replace("even", "odd")) {
                nextPost.classList.replace("odd", "even");
            }
            nextPost = nextPost.nextElementSibling;
        }
    }
}

async function doSetText(frame, messageContent) {
    if (g_spoofedPost !== null) {
        const idx = messageContent.index;
        if (idx < g_textOptions.length) {
            const content = g_spoofedPost.getElementsByClassName("message-content")[0];
            content.innerHTML = g_textOptions[idx];
        }
    }
}

async function doShakeStart(frame, messageContent) {
    // frame.classList.add("shake");
    for (const elem of document.getElementsByTagName("*")) {
        elem.classList.add("shake");
    }
}

async function doShakeStop(frame, messageContent) {
    // frame.classList.remove("shake");
    for (const elem of document.getElementsByTagName("*")) {
        elem.classList.remove("shake");
    }
}

async function messageHandler(event) {
    // if (event.origin !== "https://forum.starmen.net/") return;
    console.log(event.data);

    // each command handler uses the same function prototype
    const messageTypes = {
        hello: doHello,
        delbadge: doDeleteBadge,
        dummypost: doDummyPost,
        resize: doResize,
        settext: doSetText,
        shakestart: doShakeStart,
        shakestop: doShakeStop,
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
    addEventListener("message", (event) => messageHandler(event), false);
}

// TODO: would ideally like this to instead live in the `onload` attribute of the iframe tag
document.addEventListener("DOMContentLoaded", registerListener);
