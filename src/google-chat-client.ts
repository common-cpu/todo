import { google } from "googleapis";
import { Config } from "./config";

export class GoogleChatClient {
  private spaceId: string;
  private serviceAccountJson: string;

  constructor(config: Config) {
    this.spaceId = config.googleChat.spaceId;
    this.serviceAccountJson = config.googleChat.serviceAccountJson;
  }

  private async getAuthClient() {
    const credentials = JSON.parse(this.serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/chat.bot"],
    });
    return auth;
  }

  async postMessage(text: string): Promise<void> {
    const auth = await this.getAuthClient();
    const chat = google.chat({ version: "v1", auth });

    await chat.spaces.messages.create({
      parent: this.spaceId,
      requestBody: {
        text,
      },
    });
  }
}
