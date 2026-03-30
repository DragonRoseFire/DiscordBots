import { Interaction } from "discord.js";
import { handleAufgabe } from "../commands/aufgabe.js";
import { handleAufgaben } from "../commands/aufgaben.js";
import { handleUebernehmen } from "../commands/uebernehmen.js";
import { handleErledigt } from "../commands/erledigt.js";
import { handleAufgabeInfo } from "../commands/aufgabeInfo.js";
import { handleAufgabeLoeschen } from "../commands/aufgabeLoeschen.js";
import { handleAufgabeBearbeiten } from "../commands/aufgabeBearbeiten.js";
import { handleHilfe } from "../commands/hilfe.js";

export async function handleInteraction(interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case "aufgabe":
        await handleAufgabe(interaction);
        break;
      case "aufgaben":
        await handleAufgaben(interaction);
        break;
      case "übernehmen":
        await handleUebernehmen(interaction);
        break;
      case "erledigt":
        await handleErledigt(interaction);
        break;
      case "aufgabe-info":
        await handleAufgabeInfo(interaction);
        break;
      case "aufgabe-löschen":
        await handleAufgabeLoeschen(interaction);
        break;
      case "aufgabe-bearbeiten":
        await handleAufgabeBearbeiten(interaction);
        break;
      case "hilfe":
        await handleHilfe(interaction);
        break;
    }
  } catch (err) {
    console.error(`Fehler beim Befehl "${commandName}":`, err);
    const msg = { content: "❌ Ein Fehler ist aufgetreten. Bitte versuche es erneut.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg);
    } else {
      await interaction.reply(msg);
    }
  }
}
