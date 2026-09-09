import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits
} from 'discord.js';
import { getConfig } from '../config.js';

// stored in the channel topic so a ticket stays identifiable across bot restarts,
// without needing its own database
const TOPIC_PREFIX = 'ticket:';

const MEMBER_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.AttachFiles
];

export async function sendPanel(channel) {
  const { tickets } = getConfig();
  const embed = new EmbedBuilder()
    .setTitle(tickets.panelTitle)
    .setDescription(tickets.panelText)
    .setColor(0x2ecc71);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_open').setLabel(tickets.buttonLabel).setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

export async function handleTicketButton(interaction) {
  if (interaction.customId === 'ticket_open') return openTicket(interaction);
  if (interaction.customId === 'ticket_close') return closeTicket(interaction);
}

async function openTicket(interaction) {
  const { tickets } = getConfig();
  if (!tickets.enabled) {
    return interaction.reply({ content: 'Tickets sind aktuell deaktiviert.', flags: MessageFlags.Ephemeral });
  }

  const guild = interaction.guild;
  const existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.topic === TOPIC_PREFIX + interaction.user.id
  );
  if (existing) {
    return interaction.reply({ content: `Du hast schon ein offenes Ticket: ${existing}`, flags: MessageFlags.Ephemeral });
  }

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: MEMBER_PERMS }
  ];
  for (const roleId of tickets.staffRoleIds) {
    if (guild.roles.cache.has(roleId)) {
      overwrites.push({ id: roleId, allow: [...MEMBER_PERMS, PermissionFlagsBits.ManageMessages] });
    }
  }

  const channel = await guild.channels.create({
    name: `ticket-${interaction.user.username}`.slice(0, 90),
    type: ChannelType.GuildText,
    parent: tickets.categoryId || null,
    topic: TOPIC_PREFIX + interaction.user.id,
    permissionOverwrites: overwrites
  });

  const embed = new EmbedBuilder()
    .setDescription(tickets.openMessage.replaceAll('%user%', `<@${interaction.user.id}>`))
    .setColor(0x2ecc71);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Ticket schliessen').setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: tickets.staffRoleIds.length ? tickets.staffRoleIds.map((id) => `<@&${id}>`).join(' ') : null,
    embeds: [embed],
    components: [row]
  });

  await interaction.reply({ content: `Ticket erstellt: ${channel}`, flags: MessageFlags.Ephemeral });
}

export async function closeTicket(interaction) {
  const channel = interaction.channel;
  if (!channel?.topic?.startsWith(TOPIC_PREFIX)) {
    return interaction.reply({ content: 'Das hier ist kein Ticket-Channel.', flags: MessageFlags.Ephemeral });
  }

  const { tickets } = getConfig();
  const ownerId = channel.topic.slice(TOPIC_PREFIX.length);
  const isOwner = interaction.user.id === ownerId;
  const isStaff =
    tickets.staffRoleIds.some((id) => interaction.member.roles.cache.has(id)) ||
    interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

  if (!isOwner && !isStaff) {
    return interaction.reply({ content: 'Du darfst dieses Ticket nicht schliessen.', flags: MessageFlags.Ephemeral });
  }

  await interaction.reply({ content: 'Ticket wird geschlossen...' });
  await saveTranscript(channel, ownerId, interaction.user.tag);
  setTimeout(() => channel.delete().catch(() => {}), 3000);
}

async function saveTranscript(channel, ownerId, closedBy) {
  const { tickets } = getConfig();
  if (!tickets.transcriptChannelId) return;

  const target = channel.guild.channels.cache.get(tickets.transcriptChannelId);
  if (!target?.isTextBased()) return;

  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const lines = [...messages.values()]
      .reverse()
      .map((message) => {
        const time = new Date(message.createdTimestamp).toLocaleString('de-DE');
        const text = message.content || (message.embeds.length ? '[Embed]' : '[Anhang]');
        return `[${time}] ${message.author.tag}: ${text}`;
      });

    const file = new AttachmentBuilder(Buffer.from(lines.join('\n'), 'utf8'), {
      name: `${channel.name}.txt`
    });

    const embed = new EmbedBuilder()
      .setTitle('Ticket geschlossen')
      .addFields(
        { name: 'Channel', value: channel.name, inline: true },
        { name: 'Ersteller', value: `<@${ownerId}>`, inline: true },
        { name: 'Geschlossen von', value: closedBy, inline: true }
      )
      .setColor(0xe74c3c)
      .setTimestamp();

    await target.send({ embeds: [embed], files: [file] });
  } catch (err) {
    console.error('[tickets] Transkript fehlgeschlagen:', err.message);
  }
}
