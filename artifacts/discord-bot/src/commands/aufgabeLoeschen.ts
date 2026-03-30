import { ChatInputCommandInteraction } from "discord.js";
import { db, tasksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export async function handleAufgabeLoeschen(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

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

  // Only creator or server admins can delete
  const member = await interaction.guild?.members.fetch(interaction.user.id);
  const isAdmin = member?.permissions.has("Administrator") || member?.permissions.has("ManageGuild");

  if (task.createdBy !== interaction.user.id && !isAdmin) {
    await interaction.editReply({
      content: "❌ Du kannst nur Aufgaben löschen, die du selbst erstellt hast (oder wenn du Administrator-Rechte hast).",
    });
    return;
  }

  await db.delete(tasksTable).where(eq(tasksTable.id, id));

  await interaction.editReply({
    content: `🗑️ Aufgabe **#${id}: ${task.title}** wurde gelöscht.`,
  });
}
