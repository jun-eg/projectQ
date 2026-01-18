# Backend API仕様（Step1）

Base URL（Step1）：`http://127.0.0.1:<PORT>`

---

## 1. Health Check
### `GET /health`
**目的**：backend稼働確認

**Response 200**
```json
{ "ok": true, "version": "0.1.0" }
```

---

## 2. Chat
### `POST /api/chat`
**目的**：チャットメッセージを送信し、アシスタント返答を取得する

### Request
```json
{
  "message": "string",
  "conversationId": "string (optional)",
  "metadata": {
    "url": "string (optional)",
    "title": "string (optional)"
  }
}
```

### Response（Success）
```json
{
  "reply": "string",
  "conversationId": "string"
}
```

### Response（Error）
```json
{
  "error": {
    "code": "BACKEND_UNREACHABLE | TIMEOUT | UPSTREAM_ERROR | INVALID_REQUEST",
    "message": "string"
  }
}
```

---

## 3. バリデーション要件
- `message` は必須（空文字は拒否）
- `conversationId` は任意（未指定なら新規発行）
- `metadata` は任意（MVPでは未使用でも可）

---

## 4. タイムアウト要件（推奨）
- backendは外部API呼び出しにタイムアウトを設定する（例：30s）
- Front側でもタイムアウト/キャンセルを検討する（MVPでは任意）

---

## 5. 型の正
- request/responseの型は `packages/shared/src/types/chat.ts` を正とする
