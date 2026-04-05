import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { AsanaTask, AssigneeTasks } from "./types";

function formatTask(task: AsanaTask): string {
  const dueStr = task.due_on
    ? format(parseISO(task.due_on), "M/d (EEE)", { locale: ja })
    : "期限なし";

  let line = `  • *${task.name}*  〔期限: ${dueStr}〕`;

  // Parent task info
  if (task.parent) {
    line += `\n      ↳ 親タスク: ${task.parent.name}`;
  }

  // Dependencies
  if (task.dependencies.length > 0) {
    const depNames = task.dependencies.map((d) => d.name).join(", ");
    line += `\n      🔗 依存タスク: ${depNames}`;
  }

  // Link
  if (task.permalink_url) {
    line += `\n      ${task.permalink_url}`;
  }

  return line;
}

function formatSection(title: string, emoji: string, tasks: AsanaTask[]): string {
  if (tasks.length === 0) return "";

  const lines = tasks.map(formatTask).join("\n\n");
  return `${emoji} *${title}* (${tasks.length}件)\n${lines}`;
}

export function formatMessageForAssignee(assignee: AssigneeTasks): string {
  const today = format(new Date(), "yyyy年M月d日 (EEE)", { locale: ja });

  // Mention
  const mention = assignee.googleChatUserId
    ? `<${assignee.googleChatUserId}>`
    : assignee.assigneeName;

  const header = `📋 *Provia ToDo 日次レポート* — ${today}\n👤 担当: ${mention}\n${"─".repeat(30)}`;

  const sections = [
    formatSection("🚨 期限切れ", "🔴", assignee.categories.overdue),
    formatSection("📌 本日期限", "🟡", assignee.categories.today),
    formatSection("⏰ 3日以内期限", "🟠", assignee.categories.within3Days),
    formatSection("📅 今週期限", "🔵", assignee.categories.thisWeek),
    formatSection("📝 期限未設定", "⚪", assignee.categories.noDueDate),
  ].filter(Boolean);

  if (sections.length === 0) {
    return "";
  }

  return `${header}\n\n${sections.join("\n\n")}`;
}
