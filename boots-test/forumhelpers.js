
// utility

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
    
    // get the latest post from the table
    const postList = recentsPage.getElementsByTagName("tr");  // rows in table
    if (postList.length <= 1) return null;  // first row is headers
    const threadURL = postList[1].getElementsByTagName("a")[0].href;

    // get the page containing the exemplar post
    const threadHTML = await fetchForumURL(threadURL);
    if (threadHTML == null) return null;
    const otherThread = document.createElement("html");
    otherThread.innerHTML = threadHTML;

    // find the user's post in the page
    let userPost = null;
    for (const post of otherThread.getElementsByClassName("post")) {
        const profile =  post.getElementsByClassName("member")[0];
        if (profile.getAttribute("href") == profileURL) {
            userPost = post;
            break;
        }
    }
    if (userPost == null) return null;
    
    console.log(userPost);
    return userPost;
}

async function onLoadHandler() {
    registerListener();

    // TODO: replace first reply post with fake post by logged-in user
    const post = await getPostByCurrentUser();
    if (post == null) return;

}

// command handlers (same prototype for each)

function doHello(frame, messageContent) {
    const post = getPostElementOfFrame(frame);
    const postid = post.id;
    const bgcolor = getComputedStyle(post).backgroundColor;

    const profile = document.getElementById("profile");
    const username = profile !== null ? profile.innerText.trim() : null;

    // TODO: this gets the parent post's badges, not the user's badges
    const badgeElems = post.getElementsByClassName("badges");
    const badgecount = badgeElems.length > 0 ? badgeElems[0].children.length : 0;

    const pageInfo = {
        badgecount: badgecount,
        bgcolor: bgcolor,
        postid: postid,
        username: username,
    };
    return {message: "hello", content: pageInfo};
}

function doEditPost(frame, messageContent) {
    const post = getPostElementOfFrame(frame);
    const content = post.getElementsByClassName("message-content")[0];
    content.innerHTML = messageContent.html;
    return null;  // no response
}

function doResize(frame, messageContent) {
    frame.width = messageContent.width;
    frame.height = messageContent.height;
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
                "editpost": doEditPost,
                "resize": doResize,
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
