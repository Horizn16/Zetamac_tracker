// Background script for the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Zetamac Tracker extension installed');
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveScore') {
    // Handle score saving if needed
    console.log('Score received in background:', request.data);
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will open the popup automatically
});
