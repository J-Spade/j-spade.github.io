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
// utility
//

// expected origin/target domain for game messages
const g_gameOrigin = "https://wanderingboots.github.io";

// the spoofed user post element
let g_spoofedPost = null;

// all of the user's posts on the current page
let g_userPosts = [];

// possible text for the spoofed user post
const g_textOptions = [
    "<p> Hey guys! Are you tired of doing everything alone? Is it a burden to have to wait until you think of something original to say before you can participate in a conversation? Well have I got the solution for you! With the power of my new friend, you too will be able to engage in a conversation without spending any effort! Contact me now for an exclusive deal to supercharge your forum posts with my premium advanced conversational strategy toolkit. You already give so much of your data away for free, wouldn't it be nice to get something in return? Imagine being able to have your account always be the first one to reply to any topic with such insightful remarks like 'GREAT JOB' or 'COOL', showcasing to all your friends how engaged and thoughtful you are of other people's input. Never worry about missing a message from your friends with my built-in auto-reply function. Just hand over the data and we'll take care of the rest. You heard it from me friends, you do not want to miss out on this amazing way to boost your post numbers and get more eyes on you. With my enhanced-posting strategies, you will be the talk of the virtual town! There will also be a unique and cool 30-60% chance your post will contain a sponsered link to another exciting and useful purchase opportunity, which will delight and engage anyone who reads your post, possibly giving you a boost in your metrics. Don't wait, sign up now!</p>",
    "<p> Hey guys! I can't wait to show you all this cool new game I found! Imagine all the coolest games ever made all averaged into one expansive, all-inclusive experience. I'm so happy to tell everyone about smilequest, the newest game from a very talented game developper I just discovered. It's a 3D open world, hand animated pixel art retro gorgeous anime trading card game with first person hero shooter crafting survival mechanics, all featured a player-focused narrative where your choices really matter! There's a co-op mode where you can win cool skins and participate in a battle royale competitive multiplayer game world that's full of unique and memorable weapons. All this and more is made possible by the new technology the powers this game, and I can't wait to spread it all to you! If you're also ready to become a part of this new horizon for video gaming, please get in touch with me and provide just a few personal details so we can get you started. Thank you all!</p>",
    "<p> This game made me :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( :( error error error error error</p>",
];

// CSS defining a "shake" animation
//   idea shamelessly stolen from https://stackoverflow.com/questions/73537320/
const g_shakeAnimation = `
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
    animation: shake 0.25s;
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
        // first row of table is column headers
        const postRows = parser.parseFromString(recentsHTML, "text/html")
                               .getElementsByTagName("tr");
        if (postRows.length > 1) {
            const postURL = postRows[1].getElementsByTagName("a")[0].href;
            const threadHTML = await fetchForumURL(postURL);
            if (threadHTML !== null) {
                const otherThread = parser.parseFromString(threadHTML, "text/html");
                const postId = postURL.split("/").reverse()[0];
                const post = otherThread.getElementById(`post${postId}`);
                if (post !== null) {
                    return post.cloneNode(true);
                }
            }
        }
    }
    return null;
}

//
// command handlers
//
// each of these takes the iframe element and message content as arguments,
//   and returns the content to be sent back in response, if any
//

async function doHello(frame, messageContent) {
    // in case of repeat "hello" messages
    g_userPosts = [];
    g_spoofedPost = null;

    const post = frame.parentElement.parentElement.parentElement.parentElement; // gross, I know
    const profileElem = document.getElementById("profile");

    // inject shake animation CSS as a <style> tag
    const style = document.createElement("style");
    style.innerHTML = g_shakeAnimation;
    document.head.appendChild(style);

    // initialize info message
    let pageInfo = {
        badges: [],
        bgcolor: getComputedStyle(post).backgroundColor,
        frameheight: frame.height,
        hiddenbadges: [],  // not actually tracked here
        postid: post.id,
        username: null,
        userposted: false,
        weezer: false,
    }

    // if no user is logged in, use a boots post for later fourth-wall silliness
    //   (unless something goes horribly wrong, boots has a post history)
    if (profileElem == null) {
        g_spoofedPost = await fetchLastPostByUser("https://forum.starmen.net/members/Amstrauz");
        // swap the avatar for a specific one
        g_spoofedPost.getElementsByClassName("member")[0]
            .getElementsByTagName("img")[0]
            .src = "https://ssl-forum-files.fobby.net/forum_attachments/0047/6512/BootsAvvieGif.gif";

        return pageInfo;
    }

    // otherwise, grab the logged-in user's name and try to find a post of theirs to spoof
    pageInfo.username = profileElem.innerText.trim();

    const currentProfile = profileElem.getElementsByTagName("a")[0].href;
    for (const post of document.getElementsByClassName("post")) {
        const otherProfile = post.getElementsByClassName("member")[0].href;
        if (otherProfile == currentProfile) {
            g_userPosts.push(post);
        }
    }
    // if the user has posted on the current page, just clone the first one
    if (g_userPosts.length > 0 && !g_userPosts[0].classList.contains("quick")) {
        g_spoofedPost = g_userPosts[0].cloneNode(true);
        pageInfo.userposted = true;
    }
    // otherwise we have to find an exemplar post
    else {
        const newPost = await fetchLastPostByUser(currentProfile);
        if (newPost !== null) {
            g_spoofedPost = newPost;
            pageInfo.userposted = true;
        }
    }
    // if we found a post to spoof, track it and enumerate the user's badges
    if (g_spoofedPost !== null) {
        g_userPosts.splice(0, 0, g_spoofedPost);
        if (g_spoofedPost.getElementsByClassName("badges").length > 0) {
            for (const badge of g_spoofedPost.getElementsByClassName("badges")[0].children) {
                const badgeName = badge.getElementsByTagName("img")[0].src.split("/").reverse()[0];
                pageInfo.badges.push(badgeName);
                if (badgeName == "Weezerfestbadge.png") {
                    pageInfo.weezer = true;
                }
            }
        }
    }
    // if not, construct one by cloning/modifying the OP to have the user's name and sprite
    //  (we're assuming here that a user with no posts will also have no badges and no avatar)
    else {
        const op = document.getElementsByClassName("post")[0];
        g_spoofedPost = op.cloneNode(true);

        // debug userscript adds a button we don't want
        for (const buttonElem of g_spoofedPost.getElementsByTagName("button")) {
            buttonElem.remove();
        }
        
        // pull the sprite and username from the topbar profile element
        const header = g_spoofedPost.getElementsByClassName("post-header")[0];
        header.getElementsByTagName("h3")[0].innerHTML = profileElem.innerHTML;
        header.querySelector("#logoutform").remove();

        // user sprites are scaled weird in the topbar, so fix it
        if (header.getElementsByClassName("sprite").length == 1) {
            header.getElementsByClassName("sprite")[0].removeAttribute("style");
        }

        // remove any badges or signatures from the copied post
        for (const badgeElem of g_spoofedPost.getElementsByClassName("badges")) {
            badgeElem.remove();
        }
        for (const sigElem of g_spoofedPost.getElementsByClassName("sig")) {
            sigElem.remove();
        }
    }

    return pageInfo;
}

async function doResize(frame, messageContent) {
    frame.width = messageContent.width;
    frame.height = messageContent.height;
}

async function doDeleteBadge(frame, messageContent) {
    for (const post of g_userPosts) {
        for (const badge of post.getElementsByClassName("badges")[0].children) {
            const src = badge.getElementsByTagName("img")[0].src;
            if (src.endsWith(messageContent.name)) {
                // hidden badges can be restored later (all at once)
                if (messageContent.hide) {
                    badge.hidden = true;
                }
                else {
                    badge.remove();
                }
                break;
            }
        }
    }
}

async function doRestoreBadges(frame, messageContent) {
    // un-hides any previously hidden badges
    for (const post of g_userPosts) {
        for (const badge of post.getElementsByClassName("badges")[0].children) {
            badge.hidden = false;
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
        g_spoofedPost.classList = [];
        g_spoofedPost.classList.add("post", "even", "avsdoda");

        // replace the message-content with an initial value
        g_spoofedPost.getElementsByClassName("message-content")[0].innerHTML = g_textOptions[0];

        // remove any attachments that were part of the original post
        for (const attachElem of g_spoofedPost.getElementsByClassName("attachments")) {
            attachElem.remove();
        }

        // strip the links out of the edit/quote/report/etc buttons
        const utils = g_spoofedPost.getElementsByClassName("utils")[0];
        for (const elem of utils.getElementsByTagName("a")) {
            elem.href = "#";
        }

        // update the post timestamp
        const timeElem = g_spoofedPost.getElementsByClassName("changeabletime")[0];
        timeElem.innerText = "less than a minute ago";
        timeElem.title = new Date().toLocaleString("en-US", {dateStyle: "long", timeStyle: "short"});

        // insert the faked user post as a reply to the OP
        const op = document.getElementsByClassName("post")[0];
        const inserted = op.parentElement.insertBefore(g_spoofedPost, op.nextElementSibling);

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
    // there is probably a better way to do this...
    for (const elem of document.getElementsByTagName("*")) {
        elem.classList.add("shake");
    }
    for (const anim of document.getAnimations()) {
        anim.playbackRate = messageContent.intensity;
    }
}

async function doShakeStop(frame, messageContent) {
    for (const elem of document.getElementsByTagName("*")) {
        elem.classList.remove("shake");
    }
}

async function messageHandler(event) {
    // console.log(event);
    if (event.origin !== g_gameOrigin) return;

    // each command handler uses the same function prototype
    const messageTypes = {
        hello: doHello,
        delbadge: doDeleteBadge,
        dummypost: doDummyPost,
        resize: doResize,
        restorebadges: doRestoreBadges,
        settext: doSetText,
        shakestart: doShakeStart,
        shakestop: doShakeStop,
    };

    // locate the iframe source
    for (const iframe of document.getElementsByTagName("iframe")) {
        if (iframe.contentWindow == event.source) {
            try {
                // call the command handler
                messageTypes[event.data.message](iframe, event.data.content)
                    .then((response) => {
                        if (typeof response !== "undefined" && response !== null) {
                            // responses echo the command name that was sent
                            event.source.postMessage({message: event.data.message, content: response },
                                g_gameOrigin);
                        }
                    });
            }
            catch (err) {
                // if we get here, there's a bug or someone is meddling with browser dev tools
                console.error(err);
            }
            finally {
                break;
            }
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
        .innerHTML = '<iframe src="https://wanderingboots.github.io/" width="510" height="510" />';
    });
    posts[0].getElementsByClassName("post-header")[0].prepend(button);

}
makeIframeSwapButton();

