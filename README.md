# Asana → Google Chat ToDo レポーター

Asanaの複数プロジェクトから未完了タスクを取得し、Google Chatの「Provia ToDo」スペースに担当者ごとに毎日自動投稿します。

## 対象プロジェクト

- Provia
- DataArt
- BlueVoyant
- Blueship
- ZIPAIR Tokyo

## 投稿内容

担当者ごとに以下のセクションに分けて投稿します：

| セクション | 条件 |
|---|---|
| 🔴 期限切れ | 期限が過去のタスク |
| 🟡 本日期限 | 今日が期限のタスク |
| 🟠 ３日以内期限 | 期限が3日以内のタスク（本日を除く） |
| 🔵 今週期限 | 今週（月〜金）が期限のタスク（上記に該当しないもの） |

- タスクごとに所属プロジェクト名を表示
- 子タスクの場合は親タスクを明示表示
- 依存関係があるタスクも明示表示
- 担当者にメンション付き（MEMBER_MAPPINGS 設定時）

## セットアップ

### 1. Asana Personal Access Token (PAT) の取得

1. [Asana Developer Console](https://app.asana.com/0/developer-console) にアクセス
2. 「Personal access tokens」→「Create new token」
3. トークンをコピーして安全に保管

### 2. Asana プロジェクト GID の取得

対象プロジェクトそれぞれでGIDを取得します：

1. ブラウザでAsanaの該当プロジェクトを開く
2. URLから GID を取得: `https://app.asana.com/0/<PROJECT_GID>/...`

### 3. Google Chat Webhook の作成

1. Google Chat で「Provia ToDo」スペースを開く
2. スペース名をクリック →「アプリと統合」
3. 「Webhook を追加」をクリック
4. 名前を入力（例: `Asana ToDo Bot`）→「保存」
5. 表示された Webhook URL をコピーして安全に保管

### 4. メンバーマッピングの設定（任意）

担当者へのメンションを有効にするには、AsanaユーザーとGoogle ChatユーザーIDの対応表をJSON配列で用意します：

```json
[
  {
    "asanaUserId": "1234567890",
    "asanaUserName": "田中太郎",
    "googleChatUserId": "users/0987654321"
  }
]
```

- `asanaUserId`: Asana API でユーザー情報を取得するか、タスクの assignee.gid で確認
- `googleChatUserId`: Google Chat の People API または Admin SDK で取得
- 設定しない場合は担当者名のみ表示されます

### 5. GitHub Secrets の設定

リポジトリの Settings → Secrets and variables → Actions に以下を登録：

| Secret名 | 説明 | 必須 |
|---|---|---|
| `ASANA_ACCESS_TOKEN` | Asana PAT | Yes |
| `ASANA_PROJECTS` | 対象プロジェクトの `{name, gid}` 配列のJSON | Yes |
| `GOOGLE_CHAT_WEBHOOK_URL` | Google Chat Webhook URL | Yes |
| `MEMBER_MAPPINGS` | メンバーマッピングJSON配列 | No |

`ASANA_PROJECTS` のフォーマット例:

```json
[
  {"name":"Provia","gid":"1214016121056319"},
  {"name":"Blueship","gid":"1214016121056325"},
  {"name":"BlueVoyant","gid":"1214016121056331"},
  {"name":"DataArt","gid":"1214016121056337"},
  {"name":"ZIPAIR Tokyo","gid":"1214023936100425"}
]
```

### 6. 動作確認

GitHub Actions の「Daily Asana ToDo Post to Google Chat」ワークフローを手動実行（workflow_dispatch）して動作確認できます。

## スケジュール

- 平日（月〜金）JST 10:00 に自動実行（cron: `0 1 * * 1-5` UTC）
- 手動実行も可能

## ローカル開発

```bash
npm install
cp .env.example .env  # 環境変数を設定
npm run dev
```
