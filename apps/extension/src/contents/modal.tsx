import type { PlasmoCSConfig } from "plasmo"
import { useState, useRef, useEffect } from "react"
import type { ChatRequest, ChatResponse, ImageAttachment, ImageMimeType } from "@projectq/shared"
import { IMAGE_VALIDATION } from "@projectq/shared"

export const config: PlasmoCSConfig = {
  matches: ["https://example.com/*"],
  all_frames: false
}

type Message = {
  role: "user" | "assistant"
  content: string
  imageUrl?: string  // For displaying images in chat history
}

const ChatModal = () => {
  const [visible, setVisible] = useState(true)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [dragging, setDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<ImageAttachment | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Toggle visibility with Ctrl+Q
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "q") {
        e.preventDefault()
        setVisible((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (dragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      })
    }
  }

  const handleMouseUp = () => {
    setDragging(false)
  }

  // Add global event listeners for dragging
  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      return () => {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [dragging, dragOffset])

  // Cleanup preview URL on unmount or when image changes
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [imagePreviewUrl])

  // Handle image attachment from file or clipboard
  const handleImageAttach = async (file: File): Promise<void> => {
    setError(null)

    // Validate MIME type
    if (!IMAGE_VALIDATION.ALLOWED_MIME_TYPES.includes(file.type as ImageMimeType)) {
      setError(`Unsupported image format. Allowed: ${IMAGE_VALIDATION.ALLOWED_MIME_TYPES.join(", ")}`)
      return
    }

    // Validate size
    if (file.size > IMAGE_VALIDATION.MAX_SIZE_BYTES) {
      setError(`Image too large. Maximum size: ${IMAGE_VALIDATION.MAX_SIZE_BYTES / 1024 / 1024}MB`)
      return
    }

    // Convert to Base64
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data:xxx;base64, prefix
      const base64Data = result.split(",")[1]

      setPendingImage({
        data: base64Data,
        mimeType: file.type as ImageMimeType
      })

      // Create preview URL
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
      setImagePreviewUrl(URL.createObjectURL(file))
    }
    reader.onerror = () => {
      setError("Failed to read image file")
    }
    reader.readAsDataURL(file)
  }

  // Handle file input change
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageAttach(file)
    }
    // Reset input so same file can be selected again
    e.target.value = ""
  }

  // Handle paste event for clipboard images
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          handleImageAttach(file)
        }
        return
      }
    }
  }

  // Remove pending image
  const handleRemoveImage = () => {
    setPendingImage(null)
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl(null)
    }
  }

  const handleSend = async () => {
    const hasText = input.trim().length > 0
    const hasImage = pendingImage !== null

    if ((!hasText && !hasImage) || loading) return

    const userMessage = input.trim()
    console.log("[Modal] Sending message:", userMessage, "with image:", !!pendingImage)

    // Store current image preview for message history
    const currentImagePreview = imagePreviewUrl

    setInput("")
    setError(null)
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage || "(Image)",
        imageUrl: currentImagePreview || undefined
      }
    ])
    setLoading(true)

    // Clear pending image after adding to message
    const imageToSend = pendingImage
    setPendingImage(null)
    setImagePreviewUrl(null)

    try {
      const request: ChatRequest = {
        message: userMessage,
        conversationId: conversationId || undefined,
        metadata: {
          url: window.location.href,
          title: document.title
        },
        image: imageToSend || undefined
      }

      console.log("[Modal] Sending request to background:", { ...request, image: request.image ? "[Base64 data]" : undefined })
      const response = await chrome.runtime.sendMessage({
        action: "chat",
        data: request
      })
      console.log("[Modal] Received response from background:", response)

      if (response.error) {
        console.error("[Modal] Response contains error:", response.error)
        setError(response.error)
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${response.error}`
          }
        ])
      } else {
        const chatResponse = response as ChatResponse
        if ("reply" in chatResponse) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: chatResponse.reply }
          ])
          setConversationId(chatResponse.conversationId)
        } else if ("error" in chatResponse) {
          const errorMsg =
            chatResponse.error.code === "BACKEND_UNREACHABLE"
              ? "Backend server is not running. Please start the backend server (PORT 3005)."
              : chatResponse.error.message
          setError(errorMsg)
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${errorMsg}` }
          ])
        }
      }
    } catch (err: any) {
      console.error("[Modal] Caught error:", err)
      const errorMsg =
        "Failed to connect to backend. Please ensure the backend server is running."
      setError(errorMsg)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${errorMsg}` }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!visible) return null

  return (
    <>
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      <div
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: "400px",
        height: "500px",
        backgroundColor: "transparent",
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
      {/* Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          padding: "6px",
          backgroundColor: "transparent",
          cursor: "move",
          userSelect: "none",
          display: "flex",
          justifyContent: "center"
        }}>
        <div style={{
          width: "40px",
          height: "4px",
          backgroundColor: "rgba(160, 174, 192, 0.4)",
          borderRadius: "2px"
        }} />
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          padding: "16px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          scrollbarWidth: "none",
          msOverflowStyle: "none"
        }}
        className="hide-scrollbar">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              padding: "8px 0",
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "80%",
              wordWrap: "break-word",
              color: "rgba(160, 174, 192, 0.4)"
            }}>
            {msg.imageUrl && (
              <div
                style={{
                  marginBottom: msg.content && msg.content !== "(Image)" ? "8px" : "0",
                  color: "rgba(160, 174, 192, 0.4)",
                  fontSize: "24px"
                }}>
                ◻
              </div>
            )}
            {msg.content !== "(Image)" && msg.content}
          </div>
        ))}
        {loading && (
          <div
            style={{
              padding: "8px 0",
              alignSelf: "flex-start",
              color: "rgba(160, 174, 192, 0.4)"
            }}>
            ...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "#fed7d7",
            color: "#c53030",
            fontSize: "12px",
            borderTop: "1px solid #fc8181"
          }}>
          {error}
        </div>
      )}

      {/* Image Preview */}
      {imagePreviewUrl && (
        <div
          style={{
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "transparent"
          }}>
          <span style={{ color: "rgba(160, 174, 192, 0.4)", fontSize: "20px" }}>
            ◻
          </span>
          <button
            onClick={handleRemoveImage}
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "14px",
              color: "rgba(160, 174, 192, 0.4)",
              padding: "4px"
            }}
            title="Remove image">
            x
          </button>
        </div>
      )}

      {/* Input */}
      <div
        style={{
          padding: "12px",
          backgroundColor: "transparent",
          display: "flex",
          gap: "8px"
        }}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_VALIDATION.ALLOWED_MIME_TYPES.join(",")}
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          style={{
            padding: "8px",
            backgroundColor: "transparent",
            color: "rgba(160, 174, 192, 0.4)",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "16px"
          }}
          title="Attach image">
          +
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onPaste={handlePaste}
          placeholder="..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "8px",
            backgroundColor: "transparent",
            border: "none",
            fontSize: "14px",
            outline: "none",
            color: "rgba(160, 174, 192, 0.4)"
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || (!input.trim() && !pendingImage)}
          style={{
            padding: "8px",
            backgroundColor: "transparent",
            color: "rgba(160, 174, 192, 0.4)",
            border: "none",
            cursor: loading || (!input.trim() && !pendingImage) ? "not-allowed" : "pointer",
            fontSize: "16px",
            opacity: loading || (!input.trim() && !pendingImage) ? 0.5 : 1
          }}>
          &gt;
        </button>
      </div>
    </div>
    </>
  )
}

export default ChatModal
