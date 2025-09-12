import "dotenv/config";

import { CronJob } from "cron";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { GROUP_COLLECTION_NAME } from "./consts.js";
import { handleMessageUpdate, removeOldTokens } from "./handler.js";

initializeApp();

const db = getFirestore();
const doc = db.collection(GROUP_COLLECTION_NAME);

doc.onSnapshot(handleMessageUpdate);
console.log("Listening for changes...");

const job = CronJob.from({
  cronTime: "0 0 * * *", // every day at midnight
  onTick: removeOldTokens,
  runOnInit: true,
  waitForCompletion: true,
  name: "Remove old tokens",
});
job.start();
console.log("Cron job started: Remove old tokens");
