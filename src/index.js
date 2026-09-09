import { loadConfig } from './config.js';
import { startBot } from './bot/client.js';
import { startWeb } from './web/server.js';

if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN fehlt. In Railway unter Variables eintragen.');
  process.exit(1);
}

loadConfig();

const client = await startBot();
startWeb(client);

process.on('unhandledRejection', (err) => console.error('[unhandled]', err));
