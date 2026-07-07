import { Config } from "./config";

const MAX_MESSAGE_LENGTH = 4096;

export class GoogleChatClient {
  private webhookUrl: string;

  constructor(config: Config) {
    this.webhookUrl = config.googleChat.webhookUrl;
  }

  async postMessage(text: string): Promise<void> {
    const parts = this.splitMessage(text);

    for (const part of parts) {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify({ text: part }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Google Chat webhook error ${response.status}: ${body}`);
      }

      if (parts.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private splitMessage(text: string): string[] {
    if (text.length <= MAX_MESSAGE_LENGTH) {
      return [text];
    }

    const parts: string[] = [];
    const lines = text.split("\n");
    let current = "";

    for (const line of lines) {
      if (current.length + line.length + 1 > MAX_MESSAGE_LENGTH) {
        if (current) parts.push(current);
        current = line;
      } else {
        current = current ? current + "\n" + line : line;
      }
    }
    if (current) parts.push(current);

    return parts;
  }
}
