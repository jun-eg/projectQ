# ProjectQ - Chrome Extension Chat Modal + Local Backend

このリポジトリは、特定Webサイト上にドラッグ可能なモーダルを表示し、モーダル内でチャットできる Chrome拡張（Plasmo）と、
外部AI通信（LangChain + GPT-4）を担うローカルBackendを、TypeScriptモノレポで開発するためのテンプレートです。

## 📁 プロジェクト構成

```
projectQ/
├── apps/
│   ├── backend/      # ローカルAPI（Express + LangChain）
│   └── extension/    # Chrome拡張（Plasmo + React）
├── packages/
│   └── shared/       # 共通型定義
└── docs/            # 仕様書
```

## 🚀 クイックスタート

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. Backend設定

OpenAI APIキーを設定します：

```bash
cd apps/backend
cp .env.example .env
# .envファイルを編集してOPENAI_API_KEYを設定
```

### 3. 開発サーバー起動

ルートディレクトリで以下を実行すると、BackendとExtensionの両方が起動します：

```bash
pnpm dev
```

- Backend: `http://127.0.0.1:3005`
- Extension: `apps/extension/build/chrome-mv3-dev/` にビルドされます

### 4. Chrome拡張を読み込む

1. Chromeで `chrome://extensions` を開く
2. 右上の「デベロッパーモード」をONにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `apps/extension/build/chrome-mv3-dev` を選択

### 5. 動作確認

1. https://example.com を開く（または manifest で指定したURL）
2. モーダルが右上に表示されます
3. モーダルをドラッグして移動できます
4. メッセージを入力して送信すると、GPT-4から返答が返ります

## 📝 E2Eテスト手順

### Backend単体テスト

```bash
# Health check
curl http://127.0.0.1:3005/health

# Chat API
curl -X POST http://127.0.0.1:3005/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

### 拡張機能テスト

1. **モーダル表示**: example.comでモーダルが表示されることを確認
2. **ドラッグ移動**: ヘッダーをドラッグしてモーダルを移動
3. **チャット送信**: メッセージを入力して送信
4. **Backend未起動時**: Backendを停止し、エラーメッセージが表示されることを確認

## 🛠️ 技術スタック

- **Monorepo**: pnpm workspaces
- **Frontend**: Plasmo + React + TypeScript
- **Backend**: Express + TypeScript + LangChain
- **AI**: OpenAI GPT-4 (via @langchain/openai)

## 📚 ドキュメント

詳細な仕様は以下を参照：

1. `docs/requirements/step1-windows.md` - Step1（Windows完結MVP）の要件
2. `docs/api/backend-api.md` - Backend API仕様
3. `docs/architecture/overview.md` - アーキテクチャ概要
4. `CLAUDE.md` - Claude Code用の指示書

## 🔧 開発コマンド

```bash
# すべて開発モードで起動
pnpm dev

# Backend のみ起動
cd apps/backend && pnpm dev

# Extension のみビルド
cd apps/extension && pnpm dev

# 本番ビルド
pnpm build

# クリーンアップ
pnpm clean
```

## 📋 成功条件（Step1 MVP）

- [x] 指定したWebサイトでのみモーダルが表示される
- [x] モーダルがドラッグで移動できる
- [x] モーダルから送信 → Backend → 外部API → 返答表示が一連で成功する
- [x] Backend停止時にFrontが「backend未起動」を適切に表示する
- [x] 機密（APIキー等）がFront側に存在しない

## 🔐 セキュリティ

- APIキーは`apps/backend/.env`でのみ管理
- Front（拡張）には秘匿情報を含めない
- Backendは`127.0.0.1`にバインド（Step1）

## 🚧 今後の拡張（Step2以降）

- BackendをVirtualBox Ubuntuへ移植
- ネットワーク分離（Win=WiFiA / Ubuntu=WiFiB）
- 会話履歴の永続化（DB保存）
- ストリーミング対応（SSE/WebSocket）
