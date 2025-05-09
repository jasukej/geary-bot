import "dotenv/config";
import pkg from "@slack/bolt";
const { App } = pkg;
import fs from "fs";
import "./birthday.js";

const roles = JSON.parse(fs.readFileSync("roles.json", "utf8"));
const pingMap = new Map();

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true, // set to false if calling URL
  appToken: process.env.SLACK_APP_TOKEN, // else if socket mode
});

// Debug logs
app.receiver.client.on("connecting", () => {
  console.log("Connecting to Slack using Socket Mode...");
});

app.receiver.client.on("connected", () => {
  console.log("Socket Mode connection established.");
});

app.receiver.client.on("error", (error) => {
  console.error("Socket Mode connection error:", error);
});

// Listens for messages containing role mentions e.g. @dev
app.message(async ({ message, say }) => {
  if (message.subtype || message.bot_id) {
    return;
  }

  const regex = /@(\w+)/g;
  const found = [...message.text.matchAll(regex)];
  const usersToPing = new Set();

  for (const [, role] of found) {
    const lowerCaseRole = role.toLowerCase();
    if (roles[lowerCaseRole]) {
      roles[lowerCaseRole].forEach((userId) => usersToPing.add(userId));
    }
  }

  if (usersToPing.size > 0) {
    const tagString = Array.from(usersToPing)
      .map((u) => `<@${u}>`)
      .join(" ");
    console.log(tagString);
    const res = await say({ text: `${tagString}`, thread_ts: message.ts });
    pingMap.set(`${message.channel}:${message.ts}`, res.ts);
  }
});

// Delete message if original message is deleted
// app.event("message", async({ event, client }) => {
//   if (event.subtype !== "message_deleted") return;

//   const key = `${event.channel}:${event.deleted_ts}`;
//   const pingTs = pingMap.get(key);
//   if (!pingTs) return;

//   await client.chat.delete({ channel: event.channel, ts: pingTs });
//   pingMap.delete(key);
// });

// Start
(async () => {
  // Start the app
  await app.start(process.env.PORT || 3000);
  console.log("Geary bot running");
})();
