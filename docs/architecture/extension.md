# Chrome拡張（Plasmo）構成

---

## 構成要素
- Content Script UI（CSUI）
  - 特定サイト上にモーダルをマウント
  - ドラッグ移動可能なヘッダを持つ
  - チャットUI（履歴・入力・送信・エラー表示）
- Background（Service Worker）
  - CSUIからのメッセージを受け取り、BackendへHTTPで中継
  - `/health` による簡易ヘルスチェック（任意）

---

## データフロー（例）
1. ユーザーがモーダルで送信
2. CSUI → BG に `{ type: "CHAT", payload: ChatRequest }` を送信
3. BGが Backend `POST /api/chat` を呼び、結果を返す
4. CSUIは返答を履歴に追加し描画

---

## UI要件（MVP）
- モーダル表示はURLパターンで限定
- ドラッグで移動可能
- 送信中はローディング表示
- エラー時は「原因＋次アクション」を表示
