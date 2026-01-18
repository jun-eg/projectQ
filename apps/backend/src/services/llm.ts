import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages"
import type { ImageAttachment } from "@projectq/shared"

// Conversation storage (in-memory for MVP)
interface Conversation {
  messages: BaseMessage[]
  createdAt: Date
  lastAccessedAt: Date
}

const conversations = new Map<string, Conversation>()
const MAX_MESSAGES = 10 // Keep last 10 turns
const CONVERSATION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

// Cleanup old conversations periodically
setInterval(() => {
  const now = Date.now()
  for (const [id, conv] of conversations.entries()) {
    if (now - conv.lastAccessedAt.getTime() > CONVERSATION_TIMEOUT) {
      conversations.delete(id)
      console.log(`Cleaned up conversation ${id}`)
    }
  }
}, 5 * 60 * 1000) // Every 5 minutes

export class LLMService {
  private model: ChatOpenAI

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey === "sk-dummy-key-for-now") {
      console.warn("Warning: OPENAI_API_KEY not properly configured")
    }

    // Use gpt-4-turbo as GPT-5 placeholder
    this.model = new ChatOpenAI({
      modelName: "gpt-4-turbo",
      temperature: 0.7,
      timeout: 30000, // 30s timeout
      openAIApiKey: apiKey
    })
  }

  // Build message content for text-only or multimodal (Vision API)
  private buildMessageContent(
    message: string,
    image?: ImageAttachment
  ): string | Array<{ type: string; text?: string; image_url?: { url: string } }> {
    if (!image) {
      return message
    }

    // Multimodal message with image
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = []

    if (message.trim()) {
      content.push({ type: "text", text: message })
    }

    content.push({
      type: "image_url",
      image_url: {
        url: `data:${image.mimeType};base64,${image.data}`
      }
    })

    return content
  }

  async chat(
    message: string,
    conversationId?: string,
    image?: ImageAttachment
  ): Promise<{ reply: string; conversationId: string }> {
    const id = conversationId || crypto.randomUUID()

    // Get or create conversation
    let conversation = conversations.get(id)
    if (!conversation) {
      conversation = {
        messages: [],
        createdAt: new Date(),
        lastAccessedAt: new Date()
      }
      conversations.set(id, conversation)
    }

    // Build message content (text-only or multimodal)
    const messageContent = this.buildMessageContent(message, image)
    const humanMessage = typeof messageContent === "string"
      ? new HumanMessage(messageContent)
      : new HumanMessage({ content: messageContent })
    conversation.messages.push(humanMessage)
    conversation.lastAccessedAt = new Date()

    // Keep only last MAX_MESSAGES
    if (conversation.messages.length > MAX_MESSAGES * 2) {
      conversation.messages = conversation.messages.slice(-MAX_MESSAGES * 2)
    }

    try {
      // Call LLM
      const response = await this.model.invoke(conversation.messages)
      const reply = response.content.toString()

      // Add assistant message
      conversation.messages.push(new AIMessage(reply))

      return { reply, conversationId: id }
    } catch (error: any) {
      console.error("LLM error:", error)

      // Check for specific error types
      if (error.message?.includes("timeout")) {
        throw new Error("TIMEOUT")
      } else if (error.message?.includes("API key")) {
        throw new Error("UPSTREAM_ERROR: Invalid API key")
      } else {
        throw new Error("UPSTREAM_ERROR")
      }
    }
  }

  // Optional: Get conversation info (for debugging)
  getConversationInfo(conversationId: string) {
    const conv = conversations.get(conversationId)
    if (!conv) return null
    return {
      messageCount: conv.messages.length,
      createdAt: conv.createdAt,
      lastAccessedAt: conv.lastAccessedAt
    }
  }
}
