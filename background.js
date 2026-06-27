chrome.action.onClicked.addListener((tab) => {
  try {
    const urlObj = new URL(tab.url);
    const hostname = urlObj.hostname;

    const isOfficialGoogle = /(^|\.)google\.com$/.test(hostname);
    const likeGoogle = /google\.com/.test(hostname) || /gemini\./.test(hostname)

    if (isOfficialGoogle) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
    } else if (likeGoogle) {
      console.log("警告: 未対応または偽装の可能性があるドメインです: " + hostname);
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (host) => {
          alert(`【お知らせ】\n現在のウェブサイト（${host}）は公式のGoogle/Geminiではない可能性があるため、実行を中止しました。`);
        },
        args: [hostname]
      });
    }
  } catch (e) {
    console.error("URLの解析に失敗しました。", e);
  }
});
