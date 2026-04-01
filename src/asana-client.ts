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

  async fetchIncompleteTasks(): Promise<AsanaTask[]> {
    const tasks: AsanaTask[] = [];
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

    let offset: string | undefined;

    // Paginate through all tasks
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
          tasks.push({
            gid: task.gid,
            name: task.name,
            due_on: task.due_on || null,
            completed: task.completed,
            assignee: task.assignee
              ? { gid: task.assignee.gid, name: task.assignee.name }
              : null,
            parent: task.parent
              ? { gid: task.parent.gid, name: task.parent.name }
              : null,
            dependencies: [],
            permalink_url: task.permalink_url || "",
          });
        }
      }

      offset = response.next_page?.offset;
    } while (offset);

    // Fetch dependencies for each task
    await this.enrichWithDependencies(tasks);

    return tasks;
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
