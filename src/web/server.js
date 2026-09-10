import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { ChannelType } from 'discord.js';
import { getConfig, saveConfig } from '../config.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const SESSION_HOURS = 12;

// Sessions liegen absichtlich nur im RAM: nach einem Redeploy muss man sich neu
// einloggen, dafür gibt es nichts, was jemand aus einer Datei klauen könnte.
const sessions = new Map();

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_HOURS * 3600_000);
  return token;
}

function validSession(token) {
  const expires = sessions.get(token);
  if (!expires) return false;
  if (Date.now() > expires) {
    sessions.delete(token);
    return false;
  }
  return true;
}

/** Zeitkonstanter Vergleich, damit man das Passwort nicht über die Antwortzeit erraten kann. */
function passwordMatches(input) {
  const expected = process.env.DASHBOARD_PASSWORD || '';
  const a = Buffer.from(String(input || ''));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function resolveGuild(client) {
  const id = process.env.GUILD_ID;
  return id ? client.guilds.cache.get(id) : client.guilds.cache.first();
}

export function startWeb(client) {
  if (!process.env.DASHBOARD_PASSWORD) {
    console.error('[web] DASHBOARD_PASSWORD ist nicht gesetzt - Dashboard wird NICHT gestartet.');
    return null;
  }

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.post('/api/login', (req, res) => {
    if (!passwordMatches(req.body?.password)) {
      return res.status(401).json({ error: 'Falsches Passwort.' });
    }
    res.cookie('session', createSession(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_HOURS * 3600_000
    });
    res.json({ ok: true });
  });

  app.post('/api/logout', (req, res) => {
    sessions.delete(req.cookies?.session);
    res.clearCookie('session');
    res.json({ ok: true });
  });

  app.get('/api/session', (req, res) => {
    res.json({ loggedIn: validSession(req.cookies?.session) });
  });

  // ab hier ist alles unter /api geschützt
  app.use('/api', (req, res, next) => {
    if (!validSession(req.cookies?.session)) return res.status(401).json({ error: 'Nicht eingeloggt.' });
    next();
  });

  app.get('/api/config', (req, res) => {
    res.json(getConfig());
  });

  app.post('/api/config', (req, res) => {
    res.json(saveConfig(req.body || {}));
  });

  app.get('/api/guild', async (req, res) => {
    const guild = resolveGuild(client);
    if (!guild) return res.json({ ready: false, textChannels: [], categories: [], roles: [] });

    try {
      await guild.roles.fetch();
      await guild.channels.fetch();
    } catch {
      // Cache reicht aus, wenn der Fetch scheitert
    }

    const channels = [...guild.channels.cache.values()];
    res.json({
      ready: true,
      name: guild.name,
      memberCount: guild.memberCount,
      textChannels: channels
        .filter((channel) => channel.type === ChannelType.GuildText)
        .map((channel) => ({ id: channel.id, name: channel.name })),
      categories: channels
        .filter((channel) => channel.type === ChannelType.GuildCategory)
        .map((channel) => ({ id: channel.id, name: channel.name })),
      roles: [...guild.roles.cache.values()]
        .filter((role) => !role.managed && role.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map((role) => ({ id: role.id, name: role.name }))
    });
  });

  app.get('/api/status', (req, res) => {
    const guild = resolveGuild(client);
    res.json({
      online: Boolean(client.isReady?.()),
      tag: client.user?.tag || null,
      ping: Math.round(client.ws.ping),
      guild: guild?.name || null
    });
  });

  app.use(express.static(PUBLIC_DIR));

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`[web] Dashboard läuft auf Port ${port}`));
  return app;
}
