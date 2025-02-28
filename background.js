chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const HOST = "149.56.12.157";
    const PORT = "3000";

    if (message.action === "download_video") {
        // Step 1: Get the OAuth token
        chrome.identity.getAuthToken({ interactive: true }, (token) => {

            if (chrome.runtime.lastError) {
                console.error("OAuth Error:", chrome.runtime.lastError);
                sendResponse({ status: "error", message: "OAuth token error" });
                return;
            } else {
                console.log("OAuth Token:", token);
            }

            // To be super safe, immediately invalidate the token to force a fresh one next time
            chrome.identity.removeCachedAuthToken({ token: token }, () => {
                sendDownloadRequest(token);
            });

            // Step 2: Send request to backend with the OAuth token
            fetch(`http://${HOST}:${PORT}/download`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ tweetUrl: message.url })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.downloadUrl) {
                        console.log("Download URL received:", data.downloadUrl);

                        // Step 3: Trigger the download in Chrome
                        chrome.downloads.download({ url: data.downloadUrl }, (downloadId) => {
                            if (chrome.runtime.lastError) {
                                console.error("Download failed:", chrome.runtime.lastError);
                                sendResponse({ status: "error" });
                            } else {
                                console.log("Download started:", downloadId);
                                sendResponse({ status: "success" });
                            }
                        });
                    } else {
                        console.error("No valid download URL in response.");
                        sendResponse({ status: "error" });
                    }
                })
                .catch(error => {
                    console.error("Fetch error:", error);
                    sendResponse({ status: "error" });
                });
        });

        // Keep response channel open for async sendResponse
        return true;
    }
});
