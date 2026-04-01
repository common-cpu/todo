# Asana → Google Chat ToDo レポーター

Asanaの「Provia To Do」プロジェクトから未完了タスクを取得し、Google Chatの「Provia ToDo」スペースに担当者ごとに毎日自動投稿します。

## 投稿内容

担当者ごとに以下のセクションに分けて投稿します：

| セクション | 条件 |
|---|---|
| 🔴 期限切れ | 期限が過去のタスク |
| 🟡 本日期限 | 今日が期限のタスク |
| 🟠 3日以内期限 | 今日〜3日以内に期限が来るタスク |
| 🔵 今週期限 | 今週（月〜金）が期限のタスク |

- 子タスクの場合は親タスクを明示表示
- 依存関係があるタスクも明示表示
- 担当者にメンション付き

## セットアップ

### 1. Asana Personal Access Token (PAT) の取得

1. [Asana Developer Console](https://app.asana.com/0/developer-console) にアクセス
2. 「Personal access tokens」→「Create new token」
3. トークンをコピーして安全に保管

### 2. Asana プロジェクト GID の取得

1. ブラウザでAsanaの「Provia To Do」プロジェクトを開く
2. URLから GID を取得: `https://app.asana.com/0/<PROJECT_GID>/...`

### 3. Google Chat Bot のセットアップ

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成/選択
2. 「Google Chat API」を有効化
3. 「APIとサービス」→「認証情報」→「サービスアカウント」を作成
4. サービスアカウントのJSON鍵を作成・ダウンロード
5. Google Chat で Chat Bot アプリを設定:
   - [Google Chat API Configuration](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat) で Bot を構成
   - Bot を「Provia ToDo」スペースに追加

### 4. Google Chat スペースID の取得

1. Google Chat で「Provia ToDo」スペースを開く
2. スペース名をクリック →「スペースの詳細」
3. スペースIDは `spaces/XXXXXXXXX` の形式

### 5. メンバーマッピングの設定

Asanaユーザー と Google ChatユーザーID の対応表をJSON配列で用意します：

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

### 6. GitHub Secrets の設定

リポジトリの Settings → Secrets and variables → Actions に以下を登録：

| Secret名 | 説明 |
|---|---|
| `ASANA_ACCESS_TOKEN` | Asana PAT |
| `ASANA_PROJECT_GID` | 対象プロジェクトのGID |
| `GOOGLE_CHAT_SPACE_ID` | `spaces/XXXXXXXXX` 形式 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | サービスアカウントのJSON鍵（全文） |
| `MEMBER_MAPPINGS` | メンバーマッピングJSON配列 |

### 7. 動作確認

GitHub Actions の「Daily Asana ToDo Post to Google Chat」ワークフローを手動実行（workflow_dispatch）して動作確認できます。

## スケジュール

- 月〜金の JST 9:00 に自動実行（cron: `0 0 * * 1-5` UTC）
- 手動実行も可能

## ローカル開発

```bash
npm install
cp .env.example .env  # 環境変数を設定
npm run dev
```
