# Step2 移植要件（補足）— VirtualBox Ubuntu へのBackend移植 & ネットワーク分離

> このドキュメントは **Step1完了後**に実施する移植手順・要件の整理用です。

---

## 目的
- Backendを VirtualBox Ubuntu 上で実行し、Ubuntu側から外部ネットへ接続することで、
  Windows（Chrome拡張）と外部ネットワーク経路を分離する。

## 想定ネットワーク構成
- Windows：WiFi A（通常利用）
- Ubuntu（VirtualBox）：WiFi B（外部API通信に利用）
- Front↔Back：Host-Only ネットワークでローカル接続

### 推奨：VirtualBox NIC 2枚構成
- Adapter 1：Bridged（WiFi Bにブリッジ）→ Ubuntuの外向き通信
- Adapter 2：Host-Only → WindowsからUbuntuのbackendへ到達するための専用線

## 移植要件
- Backendの起動がUbuntu上で再現できる（Node, pnpm等）
- FrontのBackend接続先を `127.0.0.1` から **Ubuntu host-only IP** に切替できる
  - 例：`BACKEND_BASE_URL=http://192.168.56.101:8787`
- Ubuntu側のバックエンドは **host-only側からのみアクセス可能**にする（FWで制限）
- 外部API用の環境変数（APIキー）はUbuntu側に配置（Frontへ持たせない）

## 成功条件
- Windows上の拡張モーダルから、Ubuntu上のbackendへリクエストが届く
- Ubuntu側が外部APIへアクセスし、返答がWindowsへ戻る
- WiFi A / WiFi B を分離した状態でもE2Eが成立する
