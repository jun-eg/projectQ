# WSL2環境での「Failed to fetch」エラー調査レポート

## 問題の概要

- **症状**: モーダルからbackendにリクエストを送ると「Error: Failed to fetch」が発生
- **curlでは成功**: ターミナルから直接curlでAPIを叩くと正常に動作
- **発生環境**: Windows + WSL2 (Linux 6.6.87.2-microsoft-standard-WSL2)

## 根本原因

**WSL2とWindows間のネットワーク分離によるlocalhostアクセスの問題**

### 詳細

1. **バックエンドサーバーの状態**
   - WSL2内で `127.0.0.1:3005` にバインドして起動
   - CORS設定は正しく構成されている（`origin: true`で全オリジン許可）
   - CORSプリフライト（OPTIONS）リクエストも正常に動作

2. **curlが成功する理由**
   - curlはWSL2内のターミナルから実行される
   - WSL2内の `127.0.0.1` はWSL2自身を指す
   - 同一環境内での通信なので成功

3. **Chrome拡張が失敗する理由**
   - Chrome拡張はWindows側のChromeブラウザで動作
   - Chrome拡張のbackgroundスクリプトが `http://127.0.0.1:3005` にfetchを実行
   - **Windows側の `127.0.0.1` はWindows自身のlocalhostを指す**（WSL2ではない）
   - WSL2内のサーバーには到達できず、接続拒否される

### ネットワーク構成図

```
┌─────────────────────────────────────────────────────────┐
│  Windows側                                              │
│                                                         │
│  ┌─────────────────────┐                               │
│  │  Chrome ブラウザ     │                               │
│  │  ┌───────────────┐  │                               │
│  │  │ Chrome拡張    │  │                               │
│  │  │ (background)  │──────> fetch("http://127.0.0.1:3005")
│  │  └───────────────┘  │              │                │
│  └─────────────────────┘              │                │
│                                       ▼                │
│                              Windows localhost         │
│                              (何も起動していない)        │
│                                       ✗                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  WSL2側 (172.18.116.81)                                │
│                                                         │
│  ┌─────────────────────┐                               │
│  │  Backend Server     │                               │
│  │  127.0.0.1:3005    │  ← curlはここにアクセスできる  │
│  └─────────────────────┘                               │
│                                                         │
│  $ curl http://127.0.0.1:3005/health  ← 成功           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 解決策

### 方法1: バックエンドを0.0.0.0でバインドする（推奨）

バックエンドサーバーを全インターフェースで待ち受けるように変更し、WSL2のIPアドレスを使用します。

#### Step 1: バックエンドの修正

`apps/backend/src/index.ts` を修正:

```typescript
// 変更前
app.listen(PORT, () => {
  console.log(`Backend server running on http://127.0.0.1:${PORT}`)
})

// 変更後
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`)
  console.log(`WSL2 IP: Use 'hostname -I' to get the IP address`)
})
```

#### Step 2: Chrome拡張のBACKEND_URLを環境変数化

`apps/extension/src/background/index.ts` を修正:

```typescript
// 開発時はWSL2のIPを使用、本番は127.0.0.1
const BACKEND_URL = process.env.PLASMO_PUBLIC_BACKEND_URL || "http://127.0.0.1:3005"
```

#### Step 3: 環境変数ファイルを作成

`apps/extension/.env.development` を作成:

```
PLASMO_PUBLIC_BACKEND_URL=http://172.18.116.81:3005
```

**注意**: WSL2のIPアドレスは再起動で変わる可能性があります。

### 方法2: Windowsのポートフォワーディングを設定する

Windows側でWSL2へのポートフォワーディングを設定します。

PowerShell（管理者権限）で実行:

```powershell
# WSL2のIPを取得
$wslIp = (wsl hostname -I).Trim().Split()[0]

# ポートフォワーディング設定
netsh interface portproxy add v4tov4 listenport=3005 listenaddress=127.0.0.1 connectport=3005 connectaddress=$wslIp

# ファイアウォールルール追加
netsh advfirewall firewall add rule name="WSL2 Backend Port 3005" dir=in action=allow protocol=TCP localport=3005
```

この方法では、Chrome拡張のコード変更は不要です。

### 方法3: Windows側でバックエンドを起動する

WSL2ではなく、Windows側のNode.jsでバックエンドを起動する方法もあります。

## 確認したこと

| 項目 | 結果 |
|------|------|
| バックエンド起動 | ✅ 正常（3005ポートで起動中） |
| CORS設定 | ✅ 正しく設定されている |
| CORSプリフライト | ✅ OPTIONSリクエストは正常に処理 |
| manifest.json権限 | ✅ `http://127.0.0.1/*` が設定済み |
| ビルド済みスクリプト | ✅ 正しくコンパイル済み |

## 関連ファイル

- `apps/backend/src/index.ts:31-33` - サーバーバインド設定
- `apps/extension/src/background/index.ts:23` - BACKEND_URL定義
- `apps/extension/build/chrome-mv3-dev/manifest.json` - 拡張機能マニフェスト

## 参考情報

- WSL2のネットワークはNAT経由でWindowsと通信
- WSL2のlocalhostとWindowsのlocalhostは別のネットワーク空間
- WSL2のIPは `hostname -I` または `ip addr show eth0` で確認可能
