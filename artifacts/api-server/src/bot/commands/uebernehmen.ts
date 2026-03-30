import { ChatInputCommandInteraction, Colors, EmbedBuilder } from "discord.js";
import { db, tasksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { buildTaskEmbed } from "../utils/embeds.js";

export async function handleUebernehmen(interaction: ChatInputCommandInteraction) {
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

  if (task.status === "done") {
    await interaction.editReply({ content: `❌ Aufgabe **#${id}** ist bereits erledigt und kann nicht übernommen werden.` });
    return;
  }

  const [updated] = await db
    .update(tasksTable)
    .set({
      assignedTo: interaction.user.id,
      assignedToName: interaction.user.username,
      status: "in_progress",
      updatedAt: new Date(),
    })
    .where(eq(tasksTable.id, id))
    .returning();

  const embed = buildTaskEmbed(updated);
  await interaction.editReply({
    content: `✅ <@${interaction.user.id}> hat Aufgabe **#${id}** übernommen!`,
    embeds: [embed],
  });
}
