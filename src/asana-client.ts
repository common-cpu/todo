import { AsanaTask } from "./types";
import { Config } from "./config";

interface AsanaApiResponse<T> {
  data: T;
  next_page?: { offset: string } | null;
}

export class AsanaClient {
  private accessToken: string;
  private projectGid: string;
  private baseUrl = "https://app.asana.com/api/1.0";

  constructor(config: Config) {
    this.accessToken = config.asana.accessToken;
    this.projectGid = config.asana.projectGid;
  }

  private async request<T>(path: string, params?: Record<string, string>): Promise<AsanaApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Asana API error ${response.status}: ${body}`);
    }

    return response.json() as Promise<AsanaApiResponse<T>>;
  }

  private mapTask(raw: any): AsanaTask {
    return {
      gid: raw.gid,
      name: raw.name,
      due_on: raw.due_on || null,
      completed: raw.completed,
      assignee: raw.assignee
        ? { gid: raw.assignee.gid, name: raw.assignee.name }
        : null,
      parent: raw.parent
        ? { gid: raw.parent.gid, name: raw.parent.name }
        : null,
      dependencies: [],
      permalink_url: raw.permalink_url || "",
    };
  }

  async fetchIncompleteTasks(): Promise<AsanaTask[]> {
    const tasks: AsanaTask[] = [];
    const parentGidsWithSubtasks: string[] = [];
    const optFields = [
      "name",
      "due_on",
      "completed",
      "assignee.gid",
      "assignee.name",
      "parent.gid",
      "parent.name",
      "permalink_url",
      "num_subtasks",
    ].join(",");

    let offset: string | undefined;

    // Step 1: Fetch tasks directly in the project
    do {
      const params: Record<string, string> = {
        completed_since: "now",
        opt_fields: optFields,
        limit: "100",
      };
      if (offset) params.offset = offset;

      const response = await this.request<any[]>(
        `/projects/${this.projectGid}/tasks`,
        params
      );

      for (const task of response.data) {
        if (!task.completed) {
          tasks.push(this.mapTask(task));
          if ((task.num_subtasks ?? 0) > 0) {
            parentGidsWithSubtasks.push(task.gid);
          }
        }
      }

      offset = response.next_page?.offset;
    } while (offset);

    // Step 2: Fetch subtasks for parent tasks and merge
    const existingGids = new Set(tasks.map((t) => t.gid));
    await this.fetchAndMergeSubtasks(
      parentGidsWithSubtasks,
      tasks,
      existingGids
    );

    // Step 3: Fetch dependencies for each task
    await this.enrichWithDependencies(tasks);

    return tasks;
  }

  private async fetchAndMergeSubtasks(
    parentGids: string[],
    tasks: AsanaTask[],
    existingGids: Set<string>
  ): Promise<void> {
    const optFields = [
      "name",
      "due_on",
      "completed",
      "assignee.gid",
      "assignee.name",
      "parent.gid",
      "parent.name",
      "permalink_url",
    ].join(",");

    for (const parentGid of parentGids) {
      try {
        const response = await this.request<any[]>(
          `/tasks/${parentGid}/subtasks`,
          { opt_fields: optFields }
        );

        for (const task of response.data) {
          if (!task.completed && !existingGids.has(task.gid)) {
            tasks.push(this.mapTask(task));
            existingGids.add(task.gid);
          }
        }
      } catch {
        // Skip if subtasks can't be fetched
      }
    }
  }

  private async enrichWithDependencies(tasks: AsanaTask[]): Promise<void> {
    for (const task of tasks) {
      try {
        const response = await this.request<any[]>(
          `/tasks/${task.gid}/dependencies`,
          { opt_fields: "gid,name" }
        );
        task.dependencies = response.data.map((dep) => ({
          gid: dep.gid,
          name: dep.name,
        }));
      } catch {
        task.dependencies = [];
      }
    }
  }
}
