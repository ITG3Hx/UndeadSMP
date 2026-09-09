import { Client, Events, GatewayIntentBits, MessageFlags, Partials } from 'discord.js';
import { handleCommand, registerCommands } from './commands.js';
import { handleTicketButton } from './tickets.js';
import { handleMemberAdd } from './welcome.js';

export function createClient() {
  // GuildMembers ist privilegiert und muss im Developer Portal unter "Bot" ->
  // "Privileged Gateway Intents" aktiviert werden, sonst startet der Bot nicht.
  return new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel]
  });
}

export async function startBot() {
  const client = createClient();

  client.once(Events.ClientReady, async (ready) => {
    console.log(`[bot] eingeloggt als ${ready.user.tag}`);
    await registerCommands(ready);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) return await handleCommand(interaction);
      if (interaction.isButton()) return await handleTicketButton(interaction);
    } catch (err) {
      console.error('[bot] Interaction-Fehler:', err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        interaction.reply({ content: 'Da ist was schiefgelaufen.', flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  });

  client.on(Events.GuildMemberAdd, (member) => {
    handleMemberAdd(member).catch((err) => console.error('[bot] Welcome-Fehler:', err));
  });

  client.on(Events.Error, (err) => console.error('[bot] Client-Fehler:', err.message));

  await client.login(process.env.DISCORD_TOKEN);
  return client;
}
