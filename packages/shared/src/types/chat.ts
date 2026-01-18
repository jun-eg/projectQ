export type ChatErrorCode =
  | "BACKEND_UNREACHABLE"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "INVALID_REQUEST"

// Image attachment types
export type ImageMimeType = "image/jpeg" | "image/png" | "image/gif" | "image/webp"

export type ImageAttachment = {
  data: string          // Base64 (data:プレフィックスなし)
  mimeType: ImageMimeType
}

// Validation constants
export const IMAGE_VALIDATION = {
  MAX_SIZE_BYTES: 5 * 1024 * 1024,  // 5MB
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"] as const
} as const

export type ChatRequest = {
  message: string
  conversationId?: string
  metadata?: {
    url?: string
    title?: string
  }
  image?: ImageAttachment
}

export type ChatSuccessResponse = {
  reply: string
  conversationId: string
}

export type ChatErrorResponse = {
  error: {
    code: ChatErrorCode
    message: string
  }
}

export type ChatResponse = ChatSuccessResponse | ChatErrorResponse
