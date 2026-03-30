import { Client, GatewayIntentBits, Partials } from "discord.js";
import { registerCommands } from "./commands/register.js";
import { handleInteraction } from "./handlers/interaction.js";
import { handleMessage } from "./handlers/message.js";
import { startReminderJob } from "./jobs/reminders.js";
import { logger } from "../lib/logger.js";

export function startDiscordBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    logger.warn("DISCORD_BOT_TOKEN not set — Discord bot will not start.");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
  });

  client.once("ready", async (c) => {
    logger.info({ tag: c.user.tag }, "Discord bot ready");
    await registerCommands(c);
    startReminderJob(c);
  });

  client.on("interactionCreate", handleInteraction);
  client.on("messageCreate", handleMessage);

  client.login(token).catch((err) => {
    logger.error({ err }, "Discord bot login failed");
  });
}
