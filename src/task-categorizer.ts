import {
  startOfDay,
  endOfDay,
  addDays,
  isBefore,
  isEqual,
  isAfter,
  startOfWeek,
  parseISO,
} from "date-fns";
import { AsanaTask, CategorizedTasks, AssigneeTasks } from "./types";
import { MemberMapping } from "./config";

export function categorizeTasks(
  tasks: AsanaTask[],
  memberMappings: MemberMapping[]
): AssigneeTasks[] {
  const today = startOfDay(new Date());
  const threeDaysLater = endOfDay(addDays(today, 3));
  // "今週" = Monday to Friday of the current week
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfDay(addDays(weekStart, 4)); // Friday

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
      within3Days: [],
      thisWeek: [],
      noDueDate: [],
    };

    for (const task of assigneeTasks) {
      if (!task.due_on) {
        categories.noDueDate.push(task);
        continue;
      }

      const dueDate = startOfDay(parseISO(task.due_on));

      if (isBefore(dueDate, today)) {
        // Overdue: due date is before today
        categories.overdue.push(task);
      } else if (isEqual(dueDate, today)) {
        // Due today
        categories.today.push(task);
      } else if (
        isAfter(dueDate, today) &&
        (isBefore(dueDate, threeDaysLater) || isEqual(dueDate, startOfDay(threeDaysLater)))
      ) {
        // Within 3 days (excluding today, already handled above)
        categories.within3Days.push(task);
      } else if (
        (isAfter(dueDate, weekStart) || isEqual(dueDate, weekStart)) &&
        (isBefore(dueDate, weekEnd) || isEqual(dueDate, startOfDay(weekEnd)))
      ) {
        // This week (Mon-Fri) but not already categorized above
        categories.thisWeek.push(task);
      }
      // Tasks beyond this week with a due date are not posted per the spec
    }

    // Only include assignees who have at least one task in any category
    const hasAnyTasks =
      categories.overdue.length > 0 ||
      categories.today.length > 0 ||
      categories.within3Days.length > 0 ||
      categories.thisWeek.length > 0 ||
      categories.noDueDate.length > 0;

    if (!hasAnyTasks) continue;

    const assigneeName =
      assigneeTasks[0]?.assignee?.name ?? "未割り当て";
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
