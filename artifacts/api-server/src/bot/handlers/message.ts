import { Message } from "discord.js";

export async function handleMessage(message: Message) {
  if (message.author.bot) return;
  // Prefix commands are not used; all commands are slash commands.
}
