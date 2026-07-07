import { AsanaProject } from "./types";

export interface MemberMapping {
  asanaUserId: string;
  asanaUserName: string;
  googleChatUserId: string;
}

export interface Config {
  asana: {
    accessToken: string;
    projects: AsanaProject[];
  };
  googleChat: {
    webhookUrl: string;
  };
  memberMappings: MemberMapping[];
}

function safeParseJson<T>(raw: string, label: string): T {
  const sanitized = raw.replace(/[\x00-\x1f\x7f]/g, " ");

  try {
    return JSON.parse(sanitized) as T;
  } catch (e) {
    throw new Error(`${label} is not valid JSON: ${(e as Error).message}`);
  }
}

export function loadConfig(): Config {
  const requiredEnvVars = [
    "ASANA_ACCESS_TOKEN",
    "ASANA_PROJECTS",
    "GOOGLE_CHAT_WEBHOOK_URL",
  ] as const;

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  const projects = safeParseJson<AsanaProject[]>(
    process.env.ASANA_PROJECTS!,
    "ASANA_PROJECTS"
  );

  if (!Array.isArray(projects) || projects.length === 0) {
    throw new Error("ASANA_PROJECTS must be a non-empty JSON array");
  }

  for (const p of projects) {
    if (!p.gid || !p.name) {
      throw new Error(
        "Each entry in ASANA_PROJECTS must have both 'gid' and 'name'"
      );
    }
  }

  let memberMappings: MemberMapping[] = [];
  if (process.env.MEMBER_MAPPINGS) {
    memberMappings = safeParseJson<MemberMapping[]>(
      process.env.MEMBER_MAPPINGS,
      "MEMBER_MAPPINGS"
    );
  }

  return {
    asana: {
      accessToken: process.env.ASANA_ACCESS_TOKEN!,
      projects,
    },
    googleChat: {
      webhookUrl: process.env.GOOGLE_CHAT_WEBHOOK_URL!,
    },
    memberMappings,
  };
}
