# Backend（Node/TS + LangChain）構成

---

## 目的
- Frontから受けたチャットリクエストを処理し、LangChain経由で外部API（GPT-5）へ問い合わせる

---

## コンポーネント
- HTTP Server
  - `GET /health`
  - `POST /api/chat`
- Chat Service
  - `conversationId` の発行/継続
  - LangChain実行
  - タイムアウト/エラーハンドリング
- Config
  - `.env` / 環境変数（APIキー、PORT等）
  - Step2用に `BASE_URL` を差し替え可能に

---

## セキュリティ方針
- APIキーはBackendのみが保持
- Step1は `127.0.0.1` bind を基本
- ログに秘匿情報を出さない

---

## 失敗時の返し方（例）
- 外部API失敗：`UPSTREAM_ERROR`
- タイムアウト：`TIMEOUT`
- リクエスト不正：`INVALID_REQUEST`
