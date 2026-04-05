export interface AsanaTask {
  gid: string;
  name: string;
  due_on: string | null;
  completed: boolean;
  assignee: {
    gid: string;
    name: string;
  } | null;
  parent: {
    gid: string;
    name: string;
  } | null;
  dependencies: Array<{
    gid: string;
    name: string;
  }>;
  permalink_url: string;
}

export interface CategorizedTasks {
  overdue: AsanaTask[];
  today: AsanaTask[];
  within3Days: AsanaTask[];
  thisWeek: AsanaTask[];
  noDueDate: AsanaTask[];
}

export interface AssigneeTasks {
  assigneeId: string;
  assigneeName: string;
  googleChatUserId: string | null;
  categories: CategorizedTasks;
}
