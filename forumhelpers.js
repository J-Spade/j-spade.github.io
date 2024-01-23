//
// utility
//

// expected origin/target domain for game messages
// TODO: replace with production itch.io domain
const g_gameOrigin = "https://wanderingboots.github.io";

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
        postid: post.id,
        username: null,
        userposted: false,
        weezer: false,
    }

    // if no user is logged in, use a boots post for later fourth-wall silliness
    //   (unless something goes horribly wrong, boots has a post history)
    if (profileElem == null) {
        g_spoofedPost = await fetchLastPostByUser("https://forum.starmen.net/members/Amstrauz");
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
                const src = badge.getElementsByTagName("img")[0].src;
                const badgeName = src.split("/").reverse()[0];
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
        if (header.getElementsByTagName("img").length == 1) {
            header.getElementsByTagName("img")[0].removeAttribute("style");
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
    // TODO: comment out logging
    console.log(event);
    if (event.origin !== g_gameOrigin) return;

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

// TODO: would ideally like this to instead live in the `onload` attribute of the iframe tag
document.addEventListener("DOMContentLoaded", registerListener);
