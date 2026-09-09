const $ = (id) => document.getElementById(id);

// id im HTML = "<sektion>-<key>", daraus wird beim Speichern wieder das Config-Objekt
const FIELDS = [
  'tickets-enabled', 'tickets-categoryId', 'tickets-staffRoleId', 'tickets-transcriptChannelId',
  'tickets-panelTitle', 'tickets-panelText', 'tickets-buttonLabel', 'tickets-openMessage',
  'welcome-enabled', 'welcome-channelId', 'welcome-message', 'welcome-autoRoleId'
];

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (res.status === 401 && path !== '/api/login') return showLogin();
  return res;
}

function showLogin() {
  $('login').classList.remove('hidden');
  $('app').classList.add('hidden');
  return null;
}

function fillSelect(select, items, current, emptyLabel) {
  select.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = emptyLabel;
  select.appendChild(none);

  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    select.appendChild(option);
  }

  // ID aus der Config, die es auf dem Server nicht mehr gibt (geloeschter Channel):
  // trotzdem anzeigen, damit sie nicht beim naechsten Speichern still verschwindet
  if (current && !items.some((item) => item.id === current)) {
    const option = document.createElement('option');
    option.value = current;
    option.textContent = `${current} (nicht gefunden)`;
    select.appendChild(option);
  }
  select.value = current || '';
}

async function load() {
  const [configRes, guildRes, statusRes] = await Promise.all([
    api('/api/config'),
    api('/api/guild'),
    api('/api/status')
  ]);
  if (!configRes || !guildRes || !statusRes) return;

  const config = await configRes.json();
  const guild = await guildRes.json();
  const status = await statusRes.json();

  $('login').classList.add('hidden');
  $('app').classList.remove('hidden');

  $('status').textContent = status.online
    ? `${status.tag} online${status.guild ? ' auf ' + status.guild : ''} - ${status.ping}ms`
    : 'Bot offline';

  fillSelect($('tickets-categoryId'), guild.categories, config.tickets.categoryId, 'Keine Kategorie');
  fillSelect($('tickets-staffRoleId'), guild.roles, config.tickets.staffRoleId, 'Keine Rolle');
  fillSelect($('tickets-transcriptChannelId'), guild.textChannels, config.tickets.transcriptChannelId, 'Keine Transkripte');
  fillSelect($('welcome-channelId'), guild.textChannels, config.welcome.channelId, 'Kein Channel');
  fillSelect($('welcome-autoRoleId'), guild.roles, config.welcome.autoRoleId, 'Keine Autorole');

  for (const field of FIELDS) {
    const [section, key] = field.split('-');
    const element = $(field);
    if (element.type === 'checkbox') element.checked = config[section][key];
    else if (element.tagName !== 'SELECT') element.value = config[section][key];
  }
}

async function save() {
  const patch = { tickets: {}, welcome: {} };
  for (const field of FIELDS) {
    const [section, key] = field.split('-');
    const element = $(field);
    patch[section][key] = element.type === 'checkbox' ? element.checked : element.value;
  }

  const res = await api('/api/config', { method: 'POST', body: JSON.stringify(patch) });
  if (!res) return;

  $('saved').textContent = res.ok ? 'Gespeichert' : 'Fehler beim Speichern';
  setTimeout(() => ($('saved').textContent = ''), 2000);
}

$('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: $('password').value })
  });

  if (res.ok) {
    $('password').value = '';
    $('login-error').textContent = '';
    load();
  } else {
    $('login-error').textContent = 'Falsches Passwort.';
  }
});

$('logout').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  showLogin();
});

$('save').addEventListener('click', save);

(async () => {
  const res = await fetch('/api/session');
  const { loggedIn } = await res.json();
  if (loggedIn) load();
  else showLogin();
})();
