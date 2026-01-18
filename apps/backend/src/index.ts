import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { healthRouter } from "./routes/health.js"
import { chatRouter } from "./routes/chat.js"

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT) || 3001

// Middleware
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))  // Increased for image uploads

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  console.log('Headers:', JSON.stringify(req.headers, null, 2))
  next()
})

// Routes
app.use("/health", healthRouter)
app.use("/api/chat", chatRouter)

// Start server (0.0.0.0 for WSL2 compatibility with Windows Chrome)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`)
})
