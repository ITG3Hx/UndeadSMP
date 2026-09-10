# Undead SMP Bot

Tickets + Welcome/Autorole, mit Web-Dashboard zum Einstellen.

## Railway

1. Dateien ins GitHub-Repo pushen, Railway deployt automatisch.
2. Unter **Variables** setzen:
   - `DISCORD_TOKEN`
   - `DASHBOARD_PASSWORD` (ohne das startet das Dashboard absichtlich nicht)
   - `GUILD_ID` (optional, sonst der erste Server)
   - `DATA_DIR=/data`
3. Unter **Settings -> Volumes** ein Volume auf `/data` mounten. Ohne Volume sind die
   Dashboard-Einstellungen nach jedem Redeploy weg.
4. Unter **Settings -> Networking** eine Domain generieren, das ist das Dashboard.

## Discord Developer Portal

Unter **Bot -> Privileged Gateway Intents** muss **Server Members Intent** an sein,
sonst startet der Bot nicht und Welcome/Autorole funktionieren nicht.

Bot-Rechte beim Einladen: Manage Channels, Manage Roles, Send Messages, Embed Links,
Attach Files, Read Message History.

Die Bot-Rolle muss in der Rollenliste **über** der Autorole stehen, sonst kann er sie
nicht vergeben.

## Commands

- `/panel` - schickt das Ticket-Panel in den aktuellen Channel (nur mit Manage Server)
- `/close` - schließt das aktuelle Ticket
- `/ping` - Latenz

## Tickets

Ein Klick auf den Panel-Button legt einen Channel in der eingestellten Kategorie an,
sichtbar nur für den Ersteller und die ausgewählten Team- und Lead-Moderator-Rollen
(mehrere möglich). Statt sofort das Team zu pingen, zeigt der Bot erst Kategorie-Buttons
mit vorgefertigten Antworten (bearbeitbar unter `faqCategories` in `src/config.js`) - erst
wenn der Nutzer sagt, dass das nicht geholfen hat, werden Team- und Lead-Moderator-Rollen
im Ticket gepingt.

Pro Person geht immer nur ein offenes Ticket. Beim Schließen wird ein Transkript in den
eingestellten Channel gepostet, danach wird der Channel gelöscht.

## Lokal testen

```
npm install
copy .env.example .env
npm start
```

Dashboard: http://localhost:3000
