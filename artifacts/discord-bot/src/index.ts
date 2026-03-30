import { Client, GatewayIntentBits, Partials } from "discord.js";
import { registerCommands } from "./commands/register.js";
import { handleInteraction } from "./handlers/interaction.js";
import { handleMessage } from "./handlers/message.js";
import { startReminderJob } from "./jobs/reminders.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  throw new Error("DISCORD_BOT_TOKEN environment variable is required.");
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
  console.log(`✅ Bot ist bereit als ${c.user.tag}`);
  await registerCommands(c);
  startReminderJob(c);
});

client.on("interactionCreate", handleInteraction);
client.on("messageCreate", handleMessage);

client.login(token);
