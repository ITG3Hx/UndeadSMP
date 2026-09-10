import { MessageFlags, PermissionFlagsBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { sendPanel, closeTicket } from './tickets.js';

const commands = [
  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Sendet das Ticket-Panel in diesen Channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('close').setDescription('Schließt das aktuelle Ticket'),
  new SlashCommandBuilder().setName('ping').setDescription('Zeigt die Latenz des Bots')
].map((command) => command.toJSON());

export async function registerCommands(client) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const guildId = process.env.GUILD_ID || client.guilds.cache.first()?.id;

  try {
    if (guildId) {
      // Guild-Commands sind sofort da, globale brauchen bis zu einer Stunde
      await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: commands });
      console.log(`[commands] ${commands.length} Commands registriert (Guild ${guildId})`);
    } else {
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log(`[commands] ${commands.length} globale Commands registriert`);
    }
  } catch (err) {
    console.error('[commands] Registrierung fehlgeschlagen:', err.message);
  }
}

export async function handleCommand(interaction) {
  if (interaction.commandName === 'panel') {
    await sendPanel(interaction.channel);
    return interaction.reply({ content: 'Panel gesendet.', flags: MessageFlags.Ephemeral });
  }

  if (interaction.commandName === 'close') {
    return closeTicket(interaction);
  }

  if (interaction.commandName === 'ping') {
    return interaction.reply({
      content: `Pong. ${Math.round(interaction.client.ws.ping)}ms`,
      flags: MessageFlags.Ephemeral
    });
  }
}
