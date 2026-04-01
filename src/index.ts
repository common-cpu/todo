import { loadConfig } from "./config";
import { AsanaClient } from "./asana-client";
import { GoogleChatClient } from "./google-chat-client";
import { categorizeTasks } from "./task-categorizer";
import { formatMessageForAssignee } from "./message-formatter";

async function main(): Promise<void> {
  console.log("🚀 Asana → Google Chat ToDo レポーターを起動します...");

  const config = loadConfig();
  const asanaClient = new AsanaClient(config);
  const chatClient = new GoogleChatClient(config);

  // 1. Asanaから未完了タスクを取得
  console.log("📥 Asanaからタスクを取得中...");
  const tasks = await asanaClient.fetchIncompleteTasks();
  console.log(`  取得タスク数: ${tasks.length}`);

  if (tasks.length === 0) {
    console.log("✅ 未完了タスクはありません。投稿をスキップします。");
    return;
  }

  // 2. タスクを担当者別・期限別に分類
  console.log("📊 タスクを分類中...");
  const assigneeTasksList = categorizeTasks(tasks, config.memberMappings);

  // 3. 担当者ごとにGoogle Chatへ投稿
  console.log("📤 Google Chatへ投稿中...");
  let postedCount = 0;

  for (const assigneeTasks of assigneeTasksList) {
    const message = formatMessageForAssignee(assigneeTasks);
    if (!message) {
      console.log(`  ⏭ ${assigneeTasks.assigneeName}: 投稿対象なし`);
      continue;
    }

    try {
      await chatClient.postMessage(message);
      postedCount++;
      console.log(`  ✅ ${assigneeTasks.assigneeName}: 投稿完了`);
    } catch (error) {
      console.error(
        `  ❌ ${assigneeTasks.assigneeName}: 投稿失敗`,
        error
      );
    }

    // Rate limit対策: 投稿間に少し間隔を空ける
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(
    `\n🎉 完了! ${postedCount}/${assigneeTasksList.length} 件のメッセージを投稿しました。`
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
