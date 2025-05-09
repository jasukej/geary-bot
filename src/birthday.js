import cron from "node-cron";
import { app } from "./index.js";
import fs from "fs";
import { zonedTimeToUtc, utcToZonedTime, format } from "date-fns-tz";
import { differenceInYears, parse } from "date-fns";

const BIRTHDAY_CHANNEL_ID = "C08QZ3A0QSY"; 
const TIME_ZONE = "America/Los_Angeles"; // PST

const birthdays = JSON.parse(fs.readFileSync("birthdays.json", "utf8"));

// Helper to get person's current age given month and day
const getAge = (birthDateString) => {
  const birthDate = parse(birthDateString, "MM/dd/yyyy", new Date());
  return differenceInYears(new Date(), birthDate);
};

// Checks current date with list of birthdays and sends a message if a birthday is found
const checkBirthdaysAndSendMessage = async () => {
  if (!birthdays.length) {
    console.log("No birthdays loaded, skipping check.");
    return;
  }

  const nowPST = utcToZonedTime(new Date(), TIME_ZONE);
  const todayMonthDayPST = format(nowPST, "MM/dd", { timeZone: TIME_ZONE });

  console.log(`Checking for birthdays on ${todayMonthDayPST} (PST)`);

  for (const person of birthdays) {
    try {
      const birthDate = parse(person.birthday, "MM/dd/yyyy", new Date());
      const personBirthdayMonthDay = format(birthDate, "MM/dd");

      if (personBirthdayMonthDay === todayMonthDayPST) {
        const age = getAge(person.birthday);
        const message = `Today is <@${person.slack_id}>'s ${age}th birthday! Wish them a happy birthday 🎉`;

        console.log(
          `It's ${person.name}'s birthday. Sending message to ${BIRTHDAY_CHANNEL_ID}.`
        );
        await app.client.chat.postMessage({
          token: process.env.SLACK_BOT_TOKEN,
          channel: BIRTHDAY_CHANNEL_ID,
          text: message,
        });
      }
    } catch (error) {
      console.error(`Error processing birthday for ${person.name}: `, error);
    }
  }
};

// Scheduled to run every day at 9:00 AM PST
cron.schedule(
  "0 9 * * *",
  () => {
    console.log("Running scheduled birthday check...");
    checkBirthdaysAndSendMessage();
  },
  {
    scheduled: true,
    timezone: TIME_ZONE,
  }
);

console.log("Birthday scheduler running, checks daily at 9.00AM");