import { EmbedBuilder } from 'discord.js';
import { getConfig } from '../config.js';

export async function handleMemberAdd(member) {
  const { welcome } = getConfig();
  if (!welcome.enabled) return;

  if (welcome.autoRoleId) {
    try {
      await member.roles.add(welcome.autoRoleId);
    } catch (err) {
      // häufigster Grund: Bot-Rolle steht in der Rollenliste unter der Autorole
      console.error('[welcome] Autorole fehlgeschlagen:', err.message);
    }
  }

  if (!welcome.channelId) return;
  const channel = member.guild.channels.cache.get(welcome.channelId);
  if (!channel?.isTextBased()) return;

  const text = welcome.message
    .replaceAll('%user%', `<@${member.id}>`)
    .replaceAll('%name%', member.user.username)
    .replaceAll('%count%', String(member.guild.memberCount));

  const embed = new EmbedBuilder()
    .setDescription(text)
    .setColor(0x2ecc71)
    .setThumbnail(member.user.displayAvatarURL());

  try {
    await channel.send({ content: `<@${member.id}>`, embeds: [embed] });
  } catch (err) {
    console.error('[welcome] Nachricht fehlgeschlagen:', err.message);
  }
}
