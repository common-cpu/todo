export interface AsanaProject {
  gid: string;
  name: string;
}

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
  project: AsanaProject;
}

export interface CategorizedTasks {
  overdue: AsanaTask[];
  today: AsanaTask[];
}

export interface AssigneeTasks {
  assigneeId: string;
  assigneeName: string;
  googleChatUserId: string | null;
  categories: CategorizedTasks;
}
