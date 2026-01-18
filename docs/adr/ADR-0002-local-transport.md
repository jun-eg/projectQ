# ADR-0002: Step1のローカル通信方式はHTTP（localhost）を採用

## Status
Accepted

## Context
- Step1はWindows上でFront/Backを同一マシンで動かし、E2Eを早期に成立させたい。
- Native MessagingやWebSocketなどは実装/配布の複雑性が上がる。

## Decision
- Step1では **HTTP（`http://127.0.0.1:<PORT>`）** を採用する。
- 将来的にストリーミング等が必要になれば、Step2以降でWS/SSEやNative Messagingを検討する。

## Consequences
- MVPが最短で組める
- Step2では接続先をUbuntu host-onlyへ差し替えるだけで移行しやすい
