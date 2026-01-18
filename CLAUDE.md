# Project Instructions for Claude（必読）

このリポジトリは **Monorepo / TypeScript** で、Chrome拡張（Front）とローカルAPI（Back）を開発します。

## 目的
- **Step1（MVP）**：Windows上で **Chrome拡張(front) + ローカルbackend** を同時に動かし、特定Webサイト上のモーダルからチャットが成立すること（E2E）。
- **Step2**：backendをVirtualBox Ubuntuへ移植し、ネットワーク分離（Win=WiFiA / Ubuntu=WiFiB）を行う（移植は後回し、設計だけ先に残す）。

## 技術スタック
- **Monorepo / TypeScript**
- Front：**Plasmo + React**（Chrome拡張）
- Back：**Node.js(TypeScript) + LangChain**（外部ネット通信担当、モデルは **GPT-5**）
- **外部APIへのネット通信はbackendのみ**。Frontは直接外部ネットへアクセスしない。

## ドキュメント参照順（必ずこの順で読む）
1. `docs/requirements/step1-windows.md`
2. `docs/api/backend-api.md`
3. `docs/architecture/overview.md`
4. `docs/requirements/nonfunctional.md`
5. （必要に応じて）`docs/adr/*`

## ルール
- 仕様が曖昧な点は、勝手に埋めずに **「前提」「選択肢」「おすすめ」** を提示し、必要なら `docs/` に追記する提案をする。
- APIの入出力は **`packages/shared` の型を正**として一致させる。
- 機密（APIキー等）をFrontに置かない。`.env` など秘匿情報はBack側のみ。
- 変更は小さく、レビューしやすい単位で進める（ファイル数と差分を抑える）。

## このリポジトリの“成功条件”（Step1）
- 指定サイトでのみモーダルが表示され、ドラッグで移動できる。
- モーダルから送信→backend→外部API→返答表示が一連で成功する。
- backend未起動時に、Frontが明確なエラー案内を出す。
