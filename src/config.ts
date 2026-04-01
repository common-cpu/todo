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

/**
 * GitHub Secrets に保存された JSON 文字列を安全にパースする。
 * Secrets は複数行JSONの改行をリテラル制御文字として保持するため、
 * JSON構造を壊さないようスペースに置換してからパースする。
 * （JSON文字列値内の \n エスケープシーケンスは2文字 '\'+'n' なので影響しない）
 */
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
    memberMappings = safeParseJson<MemberMapping[]>(
      process.env.MEMBER_MAPPINGS,
      "MEMBER_MAPPINGS"
    );
  }

  const serviceAccountCredentials = safeParseJson<Record<string, unknown>>(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON!,
    "GOOGLE_SERVICE_ACCOUNT_JSON"
  );

  return {
    asana: {
      accessToken: process.env.ASANA_ACCESS_TOKEN!,
      projectGid: process.env.ASANA_PROJECT_GID!,
    },
    googleChat: {
      spaceId: process.env.GOOGLE_CHAT_SPACE_ID!,
      serviceAccountJson: JSON.stringify(serviceAccountCredentials),
    },
    memberMappings,
  };
}
