import { startOfDay, isBefore, isEqual, parseISO } from "date-fns";
import { AsanaTask, CategorizedTasks, AssigneeTasks } from "./types";
import { MemberMapping } from "./config";

export function categorizeTasks(
  tasks: AsanaTask[],
  memberMappings: MemberMapping[]
): AssigneeTasks[] {
  const today = startOfDay(new Date());

  // Group tasks by assignee
  const assigneeMap = new Map<string, AsanaTask[]>();

  for (const task of tasks) {
    const assigneeKey = task.assignee?.gid ?? "unassigned";
    if (!assigneeMap.has(assigneeKey)) {
      assigneeMap.set(assigneeKey, []);
    }
    assigneeMap.get(assigneeKey)!.push(task);
  }

  const result: AssigneeTasks[] = [];

  for (const [assigneeId, assigneeTasks] of assigneeMap) {
    const categories: CategorizedTasks = {
      overdue: [],
      today: [],
    };

    for (const task of assigneeTasks) {
      if (!task.due_on) {
        // 期限未設定のタスクはポスト対象外
        continue;
      }

      const dueDate = startOfDay(parseISO(task.due_on));

      if (isBefore(dueDate, today)) {
        // Overdue: due date is before today
        categories.overdue.push(task);
      } else if (isEqual(dueDate, today)) {
        // Due today
        categories.today.push(task);
      }
      // 3日以内・今週期限などは対象外（期限切れと本日期限のみ通知）
    }

    // Only include assignees who have at least one task in any category
    const hasAnyTasks =
      categories.overdue.length > 0 || categories.today.length > 0;

    if (!hasAnyTasks) continue;

    const assigneeName = assigneeTasks[0]?.assignee?.name ?? "未割り当て";
    const mapping = memberMappings.find((m) => m.asanaUserId === assigneeId);

    result.push({
      assigneeId,
      assigneeName,
      googleChatUserId: mapping?.googleChatUserId ?? null,
      categories,
    });
  }

  return result;
}
