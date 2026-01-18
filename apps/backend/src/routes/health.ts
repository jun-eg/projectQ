import { Router, type Router as RouterType } from "express"

export const healthRouter: RouterType = Router()

healthRouter.get("/", (req, res) => {
  res.json({
    ok: true,
    version: "0.1.0"
  })
})
