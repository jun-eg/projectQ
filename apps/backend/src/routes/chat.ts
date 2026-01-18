import { Router, type Router as RouterType } from "express"
import type { ChatRequest, ChatResponse, ChatErrorCode, ImageMimeType } from "@projectq/shared"
import { IMAGE_VALIDATION } from "@projectq/shared"
import { LLMService } from "../services/llm.js"

export const chatRouter: RouterType = Router()

// Initialize LLM service
const llmService = new LLMService()

// Magic bytes for image validation (first few bytes of each format)
const MAGIC_BYTES: Record<ImageMimeType, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38]], // GIF87a or GIF89a
  "image/webp": [[0x52, 0x49, 0x46, 0x46]] // RIFF header
}

// Validate image attachment
function validateImage(image: { data: string; mimeType: string }): string | null {
  // Check MIME type
  if (!IMAGE_VALIDATION.ALLOWED_MIME_TYPES.includes(image.mimeType as ImageMimeType)) {
    return `Invalid image type. Allowed: ${IMAGE_VALIDATION.ALLOWED_MIME_TYPES.join(", ")}`
  }

  // Check Base64 format (should not have data: prefix)
  if (image.data.startsWith("data:")) {
    return "Image data should not include data: prefix"
  }

  // Basic Base64 validation
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
  if (!base64Regex.test(image.data)) {
    return "Invalid Base64 format"
  }

  // Check size (Base64 is ~4/3 the size of binary)
  const estimatedSize = (image.data.length * 3) / 4
  if (estimatedSize > IMAGE_VALIDATION.MAX_SIZE_BYTES) {
    return `Image too large. Maximum size: ${IMAGE_VALIDATION.MAX_SIZE_BYTES / 1024 / 1024}MB`
  }

  // Magic byte validation
  try {
    const binaryString = atob(image.data.slice(0, 20)) // Only decode first 20 chars
    const bytes = Array.from(binaryString).map(c => c.charCodeAt(0))
    const expectedMagic = MAGIC_BYTES[image.mimeType as ImageMimeType]

    const magicMatch = expectedMagic.some(magic =>
      magic.every((byte, idx) => bytes[idx] === byte)
    )

    if (!magicMatch) {
      return "Image content does not match declared MIME type"
    }
  } catch {
    return "Invalid Base64 encoding"
  }

  return null // Valid
}

chatRouter.post("/", async (req, res) => {
  try {
    const body = req.body as ChatRequest

    // Validation: message is required unless image is present
    const hasMessage = body.message && body.message.trim() !== ""
    const hasImage = !!body.image

    if (!hasMessage && !hasImage) {
      const errorResponse: ChatResponse = {
        error: {
          code: "INVALID_REQUEST",
          message: "message or image is required"
        }
      }
      return res.status(400).json(errorResponse)
    }

    // Validate image if present
    if (body.image) {
      const imageError = validateImage(body.image)
      if (imageError) {
        const errorResponse: ChatResponse = {
          error: {
            code: "INVALID_REQUEST",
            message: imageError
          }
        }
        return res.status(400).json(errorResponse)
      }
    }

    // Call LLM service
    const { reply, conversationId } = await llmService.chat(
      body.message || "",
      body.conversationId,
      body.image
    )

    const response: ChatResponse = {
      reply,
      conversationId
    }

    res.json(response)
  } catch (error: any) {
    console.error("Error in /api/chat:", error)

    // Parse error type
    let code: ChatErrorCode = "UPSTREAM_ERROR"
    let message = "An error occurred while processing your request"

    if (error.message?.includes("TIMEOUT")) {
      code = "TIMEOUT"
      message = "Request timed out. Please try again."
    } else if (error.message?.includes("UPSTREAM_ERROR")) {
      code = "UPSTREAM_ERROR"
      message = error.message.replace("UPSTREAM_ERROR: ", "") || message
    }

    const errorResponse: ChatResponse = {
      error: { code, message }
    }
    res.status(500).json(errorResponse)
  }
})
