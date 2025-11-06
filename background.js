import { ACTIONS } from "./constants.js";

const copyHandlerMap = new Map([
  [ACTIONS.COPY_SESSION, copySessionStorage],
  [ACTIONS.COPY_COOKIES, copyCookie],
  [ACTIONS.COPY_LOCAL, copyLocalStorage],
  [ACTIONS.COPY_ALL, copyAllAction],
]);
function copySessionStorage(request, sender, sendResponse) {
  chrome.scripting.executeScript(
    {
      target: { tabId: request.sourceTabId },
      function: getSessionStorage,
    },
    (results) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      if (!results[0]?.result?.success) {
        sendResponse(results[0]?.result);
        return;
      }
      chrome.scripting.executeScript(
        {
          target: { tabId: request.targetTabId },
          function: setSessionStorage,
          args: [results[0]?.result],
        },
        (setResults) => {
          console.log("setResults: ", setResults);
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
          } else if (setResults && setResults[0]?.result?.success === false) {
            sendResponse(setResults[0]?.result);
          } else {
            sendResponse({
              success: true,
              data: {
                SessionStorage: results[0]?.result?.data,
              },
            });
          }
        }
      );
    }
  );
}
function copyLocalStorage(request, sender, sendResponse) {
  chrome.scripting.executeScript(
    {
      target: { tabId: request.sourceTabId },
      function: getLocalStorage,
    },
    (results) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      if (!results[0]?.result?.success) {
        sendResponse(results[0]?.result);
        return;
      }
      chrome.scripting.executeScript(
        {
          target: { tabId: request.targetTabId },
          function: setLocalStorage,
          args: [results[0]?.result],
        },
        () => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            sendResponse({
              success: true,
              data: {
                LocalStorage: results[0]?.result?.data,
              },
            });
          }
        }
      );
    }
  );
}
function copyCookie(request, sender, sendResponse) {
  chrome.tabs.get(request.sourceTabId, function (tab) {
    chrome.cookies.getAll({ url: tab.url }, (cookies) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }

      chrome.tabs.get(request.targetTabId, (tab) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
          return;
        }

        const cookiesData = {};
        cookies.forEach((cookie) => {
          cookiesData[cookie.name] = cookie.value;
          chrome.cookies.set(
            {
              url: tab.url,
              name: cookie.name,
              value: cookie.value,
              domain: cookie.domain,
              path: cookie.path,
              secure: cookie.secure,
              httpOnly: cookie.httpOnly,
              expirationDate: cookie.expirationDate,
            },
            (cookie) => {
              if (chrome.runtime.lastError) {
                console.error("设置 Cookie 出错:", chrome.runtime.lastError);
              }
            }
          );
        });

        sendResponse({
          success: true,
          data: {
            Cookies: cookiesData,
          },
        });
      });
    });
  });
}
function copyAllAction(request, sender, sendResponse) {
  const sessionPromise = new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: request.sourceTabId },
        function: getSessionStorage,
      },
      (results) => {
        if (chrome.runtime.lastError) {
          resolve({ error: chrome.runtime.lastError.message });
          return;
        }
        resolve(results[0]?.result);
      }
    );
  });

  const localStoragePromise = new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: request.sourceTabId },
        function: getLocalStorage,
      },
      (results) => {
        if (chrome.runtime.lastError) {
          resolve({ error: chrome.runtime.lastError.message });
          return;
        }
        resolve(results[0]?.result);
      }
    );
  });

  const cookiesPromise = new Promise((resolve) => {
    chrome.tabs.get(request.sourceTabId, (tab) => {
      chrome.cookies.getAll({ url: tab.url }, (cookies) => {
        if (chrome.runtime.lastError) {
          resolve({ error: chrome.runtime.lastError.message });
          return;
        }

        const cookiesData = {};
        cookies.forEach((cookie) => {
          cookiesData[cookie.name] = cookie.value;
        });
        // 同时保存完整的cookies数组
        resolve({ success: true, data: cookiesData, allCookies: cookies });
      });
    });
  });

  Promise.all([sessionPromise, localStoragePromise, cookiesPromise])
    .then(([sessionResult, localStorageResult, cookiesResult]) => {
      const allData = {};
      if (sessionResult?.success) {
        allData.SessionStorage = sessionResult.data;
      }
      if (localStorageResult?.success) {
        allData.LocalStorage = localStorageResult.data;
      }
      if (cookiesResult?.success) {
        allData.Cookies = cookiesResult.data;
      }

      chrome.tabs.get(request.targetTabId, (tab) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
          return;
        }

        // 设置SessionStorage
        if (sessionResult?.success) {
          chrome.scripting.executeScript({
            target: { tabId: request.targetTabId },
            function: setSessionStorage,
            args: [sessionResult],
          });
        }

        // 设置LocalStorage
        if (localStorageResult?.success) {
          chrome.scripting.executeScript({
            target: { tabId: request.targetTabId },
            function: setLocalStorage,
            args: [localStorageResult],
          });
        }

        // 设置Cookies
        if (cookiesResult?.success) {
          Object.entries(cookiesResult.data).forEach(([name, value]) => {
            const cookie = cookiesResult.allCookies.find((c) => c.name === name);
            if (cookie) {
              chrome.cookies.set({
                url: tab.url,
                name,
                value,
                domain: cookie.domain,
                path: cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                expirationDate: cookie.expirationDate,
              });
            }
          });
        }

        sendResponse({
          success: true,
          data: allData,
        });
      });
    })
    .catch((error) => {
      sendResponse({
        success: false,
        error: error.message || "Unknown error occurred",
      });
    });
}
// 后台脚本，处理与popup页面的通信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  copyHandlerMap.get(request.action)(request, sender, sendResponse);
  return true; // 保持消息端口开放
});

function getSessionStorage() {
  try {
    const sessionData = Object.fromEntries(Object.entries(sessionStorage).map(([key, value]) => [key, value]));
    return { success: true, data: sessionData };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function setSessionStorage(data) {
  console.log("setSessionStorage开始执行，传入数据:", data);
  try {
    if (!data?.success) {
      console.error("无效的数据格式，缺少success标志");
      return { success: false, error: "Invalid data format" };
    }

    sessionStorage.clear();

    Object.entries(data.data).forEach(([key, value]) => {
      try {
        sessionStorage.setItem(key, value);
      } catch (error) {
        console.error(`设置sessionStorage项${key}失败:`, error);
      }
    });

    console.log("setSessionStorage执行完成");
    return { success: true, data: data.data };
  } catch (error) {
    console.error("setSessionStorage执行过程中出错:", error);
    return { success: false, error: error.message };
  }
}

function getLocalStorage() {
  try {
    const localStorageData = Object.fromEntries(Object.entries(localStorage).map(([key, value]) => [key, value]));
    return { success: true, data: localStorageData };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function setLocalStorage(data) {
  try {
    if (!data.success) {
      return data;
    }
    Object.entries(data.data).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
