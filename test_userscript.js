// ==UserScript==
// @name        Boots Project
// @namespace   Violentmonkey Scripts
// @match       https://forum.starmen.net/forum/*
// @grant       none
// @version     1.0
// @author      -
// @description 10/16/2023, 8:14:54 PM
// ==/UserScript==

//
// forumhelpers.js
//

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

// hacking this here for now
registerListener();


//
// button to replace the thread OP's avatar with an iframe pointed at josh.jspade.net
//

function makeIframeSwapButton() {
    const posts = document.getElementsByClassName("post");
    if (posts.length < 1) return;

    const button = document.createElement("button");
    button.textContent = "swap!";
    button.addEventListener("click", function() {
        posts[0].getElementsByClassName("member")[0]
            .innerHTML = '<iframe src="https://josh.jspade.net/innerframe.html" width="150" height="80" />';
    });
    posts[0].getElementsByClassName("post-header")[0].prepend(button);

}
makeIframeSwapButton();

