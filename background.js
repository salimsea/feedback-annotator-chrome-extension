// background.js (atau service worker di manifest v3)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getTabId" && sender.tab && sender.tab.id) {
    sendResponse(sender.tab.id);
    return true;
  }
});
