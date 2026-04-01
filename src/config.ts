export interface MemberMapping {
  asanaUserId: string;
  asanaUserName: string;
  googleChatUserId: string;
}

export interface Config {
  asana: {
    accessToken: string;
    projectGid: string;
  };
  googleChat: {
    spaceId: string;
    serviceAccountJson: string;
  };
  memberMappings: MemberMapping[];
}

export function loadConfig(): Config {
  const requiredEnvVars = [
    "ASANA_ACCESS_TOKEN",
    "ASANA_PROJECT_GID",
    "GOOGLE_CHAT_SPACE_ID",
    "GOOGLE_SERVICE_ACCOUNT_JSON",
  ] as const;

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  let memberMappings: MemberMapping[] = [];
  if (process.env.MEMBER_MAPPINGS) {
    memberMappings = JSON.parse(process.env.MEMBER_MAPPINGS);
  }

  // GitHub Secrets stores multi-line JSON with literal \n characters;
  // replace them so JSON.parse succeeds.
  const sanitizedServiceAccountJson =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON!.replace(/\n/g, "\\n");

  // Validate that the JSON is parseable at startup
  try {
    JSON.parse(sanitizedServiceAccountJson);
  } catch (e) {
    throw new Error(
      `GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON: ${(e as Error).message}`
    );
  }

  return {
    asana: {
      accessToken: process.env.ASANA_ACCESS_TOKEN!,
      projectGid: process.env.ASANA_PROJECT_GID!,
    },
    googleChat: {
      spaceId: process.env.GOOGLE_CHAT_SPACE_ID!,
      serviceAccountJson: sanitizedServiceAccountJson,
    },
    memberMappings,
  };
}
