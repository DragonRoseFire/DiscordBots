import { ChatInputCommandInteraction } from "discord.js";
import { db, tasksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { buildTaskEmbed } from "../utils/embeds.js";

export async function handleAufgabeInfo(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const id = interaction.options.getInteger("id", true);
  const guildId = interaction.guildId!;

  const [task] = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, id), eq(tasksTable.guildId, guildId)));

  if (!task) {
    await interaction.editReply({ content: `❌ Aufgabe **#${id}** wurde nicht gefunden.` });
    return;
  }

  const embed = buildTaskEmbed(task);
  await interaction.editReply({ embeds: [embed] });
}
