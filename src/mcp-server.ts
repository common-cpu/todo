import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { google } from "googleapis";
import { z } from "zod";

const server = new McpServer({
  name: "google-chat",
  version: "1.0.0",
});

async function getAuthClient() {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON environment variable is required");
  }
  const credentials = JSON.parse(serviceAccountJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/chat.bot"],
  });
}

server.tool(
  "google_chat_post_message",
  "Post a message to a Google Chat space",
  {
    space_id: z.string().describe("Google Chat space ID (e.g. spaces/XXXXXXXXX)"),
    message: z.string().describe("Message text to post (supports Google Chat formatting)"),
  },
  async ({ space_id, message }) => {
    try {
      const auth = await getAuthClient();
      const chat = google.chat({ version: "v1", auth });

      const response = await chat.spaces.messages.create({
        parent: space_id,
        requestBody: { text: message },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Message posted successfully. Message ID: ${response.data.name}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to post message: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "google_chat_list_spaces",
  "List Google Chat spaces the bot has access to",
  {},
  async () => {
    try {
      const auth = await getAuthClient();
      const chat = google.chat({ version: "v1", auth });

      const response = await chat.spaces.list();
      const spaces = response.data.spaces || [];

      const spaceList = spaces
        .map((s) => `- ${s.displayName} (${s.name}) [${s.type}]`)
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: spaces.length > 0
              ? `Found ${spaces.length} spaces:\n${spaceList}`
              : "No spaces found.",
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to list spaces: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "google_chat_list_members",
  "List members of a Google Chat space (useful for getting user IDs for mentions)",
  {
    space_id: z.string().describe("Google Chat space ID (e.g. spaces/XXXXXXXXX)"),
  },
  async ({ space_id }) => {
    try {
      const auth = await getAuthClient();
      const chat = google.chat({ version: "v1", auth });

      const response = await chat.spaces.members.list({
        parent: space_id,
      });
      const members = response.data.memberships || [];

      const memberList = members
        .map((m) => {
          const user = m.member;
          return `- ${user?.displayName || "Unknown"} (${user?.name || "N/A"}) [${user?.type || "N/A"}]`;
        })
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: members.length > 0
              ? `Found ${members.length} members:\n${memberList}`
              : "No members found.",
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to list members: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
