import { ChatInputCommandInteraction } from "discord.js";
import { db, tasksTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { buildTaskListEmbed } from "../utils/embeds.js";

export async function handleAufgaben(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const filter = interaction.options.getString("filter") ?? "open";
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;

  let tasks;
  let title: string;
  let description: string;

  switch (filter) {
    case "mine":
      tasks = await db
        .select()
        .from(tasksTable)
        .where(
          and(
            eq(tasksTable.guildId, guildId),
            eq(tasksTable.assignedTo, userId),
            ne(tasksTable.status, "done")
          )
        )
        .orderBy(tasksTable.createdAt);
      title = "📋 Meine Aufgaben";
      description = `Aufgaben, die dir zugewiesen sind:`;
      break;

    case "done":
      tasks = await db
        .select()
        .from(tasksTable)
        .where(and(eq(tasksTable.guildId, guildId), eq(tasksTable.status, "done")))
        .orderBy(tasksTable.updatedAt);
      title = "✅ Erledigte Aufgaben";
      description = "Alle abgeschlossenen Aufgaben:";
      break;

    case "all":
      tasks = await db
        .select()
        .from(tasksTable)
        .where(eq(tasksTable.guildId, guildId))
        .orderBy(tasksTable.createdAt);
      title = "📊 Alle Aufgaben";
      description = "Alle Aufgaben:";
      break;

    default: // open
      tasks = await db
        .select()
        .from(tasksTable)
        .where(
          and(eq(tasksTable.guildId, guildId), ne(tasksTable.status, "done"))
        )
        .orderBy(tasksTable.createdAt);
      title = "📋 Offene Aufgaben";
      description = "Alle offenen Aufgaben:";
      break;
  }

  const embed = buildTaskListEmbed(tasks, title, description);
  await interaction.editReply({ embeds: [embed] });
}
