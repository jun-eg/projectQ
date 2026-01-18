# ADR-0001: モデル役割分担（Claude / GPT-5(LangChain)）

## Status
Accepted

## Context
- 開発支援としてClaudeを利用しつつ、ワークフロー/ネット通信部分はLangChainで組む。
- LangChain処理で利用するモデルはGPT-5を予定。

## Decision
- **外部ネット通信・自動化フロー（チェーン/グラフ）は Backend + LangChain + GPT-5**
- **拡張UIや文章整形など“人間の閲覧を主とする”部分はClaudeで支援してもよいが、実行系はBack側に集約**
- Frontは外部APIへ直接アクセスしない。

## Consequences
- APIキー/秘密情報はBack側に閉じ込められる
- Front/Back境界が明確になり、Step2移植が容易
