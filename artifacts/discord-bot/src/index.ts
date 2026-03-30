import { Client, GatewayIntentBits, Events } from "discord.js";
import { handleCommand } from "./commands.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("DISCORD_BOT_TOKEN environment variable is required");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Discord music bot ready! Logged in as ${readyClient.user.tag}`);
  console.log(`Serving ${readyClient.guilds.cache.size} guild(s)`);
  console.log("Commands: !play, !skip, !stop, !pause, !resume, !queue, !nowplaying, !pl, !help");
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (!command) return;

  try {
    await handleCommand(command, args, message);
  } catch (err) {
    console.error("Error handling command:", err);
    try {
      await message.reply("An error occurred while processing your command.");
    } catch {
      // ignore reply failures
    }
  }
});

client.on(Events.Error, (err) => {
  console.error("Discord client error:", err);
});

client.login(token).catch((err) => {
  console.error("Failed to login:", err.message);
  if (err.message?.includes("disallowed intents")) {
    console.error(
      "\n⚠️  ACTION REQUIRED: Enable 'Message Content Intent' in Discord Developer Portal:\n" +
      "1. Go to https://discord.com/developers/applications\n" +
      "2. Select your application → Bot\n" +
      "3. Enable 'Message Content Intent' under Privileged Gateway Intents\n" +
      "4. Save Changes, then restart this bot.\n"
    );
  }
  process.exit(1);
});
