# 要件定義（v1）— Chrome拡張 × ローカルBackend（Monorepo / TypeScript）
対象：Claudeに渡す仕様書（**Step1中心**）

---

## 0. 前提・方針
- 開発言語：**TypeScript**
- 開発形態：**モノレポ**
- AI利用方針：
  - **LangChainを使用するネット通信（外部API呼び出し）はBackend側で実行**
  - Frontは外部ネット通信を直接行わず、Backend経由で結果を受け取る
- 開発ステップ：
  - **Step1（MVP）**：Windows上で **Front（Chrome拡張）+ Back（ローカルAPI）** を動かしてE2E動作を確認
  - **Step2**：BackendをVirtualBox上のUbuntuへ移植し、ネットワーク分離（Win=WiFiA / Ubuntu=WiFiB）を行う  
    ※本ドキュメントは **Step1を主対象**、Step2は移植要件として補足扱い

---

## 1. 目的
- 特定Webサイト上で作業中に、Chrome拡張のモーダルUIから **ChatGPTとチャット**できるようにし、開発者の作業効率を向上させる
- 将来のStep2移植を見据え、Front↔Backの境界（API・設定）を明確化する

---

## 2. スコープ
### 2.1 In Scope（実装対象）
#### Step1（Windows完結）
- **Front（Chrome拡張 / Plasmo）**
  - 特定Webサイト上に **ドラッグ移動可能なモーダル**を表示
  - モーダル内でチャット（履歴表示・入力・送信・エラー表示）
  - Content Script UI → Background → Backend の経路で通信
- **Backend（Windows上ローカル / Node + TS）**
  - ローカルAPIサーバ（HTTP）
  - LangChainを用いた外部ネット通信（モデル：**GPT-5**）
  - 会話状態（conversationId等）の管理（MVPはメモリでOK）

#### Step2（移植）
- BackendをUbuntu（VirtualBox）へ移植
- Front↔Backの接続先を `localhost` から **Ubuntu host-only IP** へ切替
- Ubuntu側から外部ネットへ接続（WiFi B）  
  ※詳細は別途拡張要件として扱う

### 2.2 Out of Scope（MVPではやらない）
- 返答のストリーミング（SSE/WS）
- Native Messaging（Backend自動起動・配布性向上）
- 会話履歴の永続化（DB保存）
- ページ操作の自動化（クリック/入力などのRPA）

---

## 3. システム構成（Step1）
### 3.1 Front（Chrome拡張）
- 技術：Plasmo + React + TypeScript
- 実行要素：
  - **Content Script UI**：Webページ上にモーダルを描画
  - **Background (Service Worker)**：BackendとのHTTP通信を中継

### 3.2 Backend（Windowsローカル）
- 技術：Node.js + TypeScript（Fastify/NestJSなどは実装側裁量）
- 役割：
  - Frontからのチャット要求を受けるHTTP APIを提供
  - LangChainで外部APIへ問い合わせ（GPT-5）
  - 返答整形・エラーハンドリング

---

## 4. 機能要件（Front）
### 4.1 表示条件
- **特定Webサイトのみ**でモーダルを表示する（URL patternで制御）

### 4.2 モーダルUI要件
- モーダルは **ドラッグで移動可能**
- UI要素：
  - メッセージ履歴（ユーザー/アシスタントを区別）
  - 入力欄（テキスト）
  - 送信ボタン
  - 送信中ローディング表示
  - エラー表示（backend未起動・タイムアウト・外部API失敗など）
  - 会話リセット（任意：conversationId破棄）

### 4.3 通信経路
- Content Script UI → Background：拡張内メッセージング（request/response）
- Background → Backend：HTTP（fetch）

---

## 5. 機能要件（Backend）
### 5.1 API（MVP）
- `GET /health`
  - Backend稼働確認
- `POST /api/chat`
  - 入力（例）：
    - `message: string`（必須）
    - `conversationId?: string`（任意）
    - `metadata?: object`（任意）
  - 出力（例）：
    - `reply: string`（必須）
    - `conversationId: string`（必須：新規発行or継続）
    - `error?: { code: string; message: string }`（任意）

### 5.2 LangChain処理
- 外部ネットワーク通信はBackendのみが行う
- LangChain利用モデル：**GPT-5**
- APIキー等の秘匿情報はBackendの環境変数で管理し、Frontに持たせない

### 5.3 会話管理
- Step1：メモリ保持（プロセス内）で可
- 将来：永続化（SQLite/PostgreSQL等）は拡張要件

---

## 6. 通信要件（Step1）
- Front（Background）→ Backend：`http://127.0.0.1:<PORT>` を基本とする
- タイムアウト・再試行方針：
  - タイムアウト：15〜30秒程度（実装裁量）
  - 再試行：0〜1回程度（実装裁量）
- 失敗時はFrontへ「原因＋次アクション」を返す（例：backendを起動してください）

---

## 7. 非機能要件（要点）
- UIはフリーズしない（送信中も操作可能）
- Backend未起動時：Frontが検知し、明確にガイド表示
- 外部API失敗時：ユーザーに分かるエラー表示
- 機密（APIキー等）をFrontに置かない

---

## 8. 開発要件（Monorepo）
### 8.1 リポジトリ構成（例）
- `apps/extension`：Plasmo拡張（Front）
- `apps/backend`：Node API（Back）
- `packages/shared`：共通型・ユーティリティ

### 8.2 起動要件
- **1コマンドでFront/Backを同時起動**できること（例：`pnpm dev`）

---

## 9. 受け入れ条件（Step1 / Definition of Done）
- 指定したWebサイトでのみモーダルが表示される
- モーダルがドラッグで移動できる
- モーダルから送信 → Backend → 外部API → 返答表示、が一連で成功する
- Backend停止時にFrontが「backend未起動」を適切に表示する
- 機密（APIキー等）がFront側に存在しない
