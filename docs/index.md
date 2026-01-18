# docs 目次

## 要件
- `requirements/step1-windows.md`：Step1（Windows完結MVP）要件定義
- `requirements/step2-ubuntu-migration.md`：Step2（Ubuntu移植・ネット分離）移植要件（補足）
- `requirements/nonfunctional.md`：非機能・セキュリティ・運用・受け入れ基準

## API
- `api/backend-api.md`：Backend API仕様（/health, /api/chat）

## アーキテクチャ
- `architecture/overview.md`：全体構成（Front/Back/通信境界）
- `architecture/extension.md`：Chrome拡張側（CSUI/Background）の構成
- `architecture/backend.md`：Backend側（LangChain/モデル/セキュリティ）

## ADR（設計判断記録）
- `adr/ADR-0001-model-routing.md`：Claude と GPT-5(LangChain) の役割分担
- `adr/ADR-0002-local-transport.md`：Step1 のローカル通信方式（HTTP）選定
