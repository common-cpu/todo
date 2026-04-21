import {
  startOfDay,
  isBefore,
  isEqual,
  isAfter,
  parseISO,
  addDays,
  startOfWeek,
} from "date-fns";
import { AsanaTask, CategorizedTasks, AssigneeTasks } from "./types";
import { MemberMapping } from "./config";

export function categorizeTasks(
  tasks: AsanaTask[],
  memberMappings: MemberMapping[]
): AssigneeTasks[] {
  const today = startOfDay(new Date());
  const threeDaysFromToday = addDays(today, 3);
  const mondayOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
  const fridayOfThisWeek = addDays(mondayOfThisWeek, 4);

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
      withinThreeDays: [],
      thisWeek: [],
    };

    for (const task of assigneeTasks) {
      if (!task.due_on) continue;

      const dueDate = startOfDay(parseISO(task.due_on));

      if (isBefore(dueDate, today)) {
        categories.overdue.push(task);
      } else if (isEqual(dueDate, today)) {
        categories.today.push(task);
      } else if (!isAfter(dueDate, threeDaysFromToday)) {
        categories.withinThreeDays.push(task);
      } else if (
        !isBefore(dueDate, mondayOfThisWeek) &&
        !isAfter(dueDate, fridayOfThisWeek)
      ) {
        categories.thisWeek.push(task);
      }
    }

    const hasAnyTasks =
      categories.overdue.length > 0 ||
      categories.today.length > 0 ||
      categories.withinThreeDays.length > 0 ||
      categories.thisWeek.length > 0;

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
