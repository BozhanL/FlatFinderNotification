import dotenv from "dotenv";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { GROUP_COLLECTION_NAME } from "./consts.js";
import { handleMessageUpdate } from "./handler.js";

dotenv.config();

initializeApp();

const db = getFirestore();
const doc = db.collection(GROUP_COLLECTION_NAME);

doc.onSnapshot(handleMessageUpdate);
console.log("Listening for changes...");
