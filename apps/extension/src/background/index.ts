// Background service worker for ProjectQ extension

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Background] Message received:", request.action)

  if (request.action === "chat") {
    // Forward request to backend
    handleChatRequest(request.data)
      .then((result) => {
        console.log("[Background] Sending success response to modal")
        sendResponse(result)
      })
      .catch((error) => {
        console.error("[Background] Sending error response to modal:", error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        sendResponse({ error: errorMessage })
      })
    return true // Keep channel open for async response
  }
})

async function handleChatRequest(data: any) {
  // WSL2環境: WindowsのChromeからWSL2内のサーバーにアクセスするため、WSL2のIPを使用
  // IPが変わった場合は `hostname -I` で確認して更新する
  const BACKEND_URL = process.env.PLASMO_PUBLIC_BACKEND_URL || "http://172.18.116.81:3005"

  console.log(`[Background] Attempting to connect to: ${BACKEND_URL}/api/chat`)
  console.log(`[Background] Request data:`, data)

  try {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    })

    console.log(`[Background] Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Background] Error response: ${errorText}`)
      throw new Error(`Backend returned ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log(`[Background] Response received:`, result)
    return result
  } catch (error) {
    console.error("[Background] Backend request failed:", error)
    if (error instanceof Error) {
      console.error("[Background] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    throw error
  }
}

console.log("ProjectQ Background Service Worker loaded")
