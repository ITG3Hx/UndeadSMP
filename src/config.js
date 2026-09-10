import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || './data';
const FILE = path.join(DATA_DIR, 'config.json');

const DEFAULTS = {
  tickets: {
    enabled: true,
    categoryId: '',
    staffRoleIds: [],
    leadModeratorRoleIds: [],
    transcriptChannelId: '',
    panelTitle: 'Support',
    panelText: 'Klick auf den Button unten, um ein Ticket zu oeffnen.',
    buttonLabel: 'Ticket oeffnen',
    openMessage: 'Hey %user%, waehl unten aus, worum es geht - vielleicht hilft dir das schon direkt weiter.',
    // Category buttons shown right when a ticket opens. The bot answers with these directly,
    // staff/lead moderators only get pinged if the user says that didn't actually help
    // (see escalateTicket in tickets.js) - not on every single ticket.
    faqCategories: [
      { label: 'Kit-Problem', answer: 'Pruef mit /kit, ob dein Kit noch komplett ausgeruestet ist - fehlt Ruestung oder die Waffe, ist der Bonus sofort weg. Kaufe es im Zweifel im Menue neu.' },
      { label: 'Gebannt / gemeldet', answer: 'Bans und Reports werden nur vom Team bearbeitet. Beschreib kurz, worum es geht (wer, wann, was), dann meldet sich jemand.' },
      { label: 'Bug melden', answer: 'Danke fuers Melden! Beschreib moeglichst genau, was passiert ist und wie man es nachstellen kann.' },
      { label: 'Sonstiges', answer: 'Beschreib kurz dein Anliegen, das Team schaut sich das gleich an.' }
    ]
  },
  welcome: {
    enabled: true,
    channelId: '',
    message: 'Willkommen auf **Undead SMP**, %user%! Du bist Member Nummer %count%.',
    autoRoleId: ''
  }
};

let config = clone(DEFAULTS);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/** Deep-merges saved values onto the defaults, so a config written by an older version
 *  still picks up any keys added later instead of silently missing them. */
function merge(defaults, saved) {
  const result = clone(defaults);
  if (!saved || typeof saved !== 'object') return result;
  for (const [key, value] of Object.entries(saved)) {
    if (!(key in result)) continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = merge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function loadConfig() {
  try {
    if (fs.existsSync(FILE)) {
      config = merge(DEFAULTS, JSON.parse(fs.readFileSync(FILE, 'utf8')));
    } else {
      writeFile();
    }
  } catch (err) {
    console.error('[config] konnte config.json nicht lesen, nutze Defaults:', err.message);
    config = clone(DEFAULTS);
  }
  return config;
}

export function getConfig() {
  return config;
}

export function saveConfig(patch) {
  config = merge(config, patch);
  writeFile();
  return config;
}

function writeFile() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('[config] konnte config.json nicht schreiben:', err.message);
  }
}
