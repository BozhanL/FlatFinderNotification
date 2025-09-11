import type { Notification } from "@notifee/react-native";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import {
  GROUP_COLLECTION_NAME,
  MESSAGE_CHANNEL_ID,
  NOTIFICATION_COLLECTION_NAME,
  TOKEN_EXPIRATION_TIME,
  TOKEN_NOT_REGISTERED,
} from "./consts.js";
import type { Group, NotificationData } from "./types.js";

export function handleMessageUpdate(snapshot: FirebaseFirestore.QuerySnapshot) {
  const db = getFirestore();
  snapshot.docChanges().forEach(async (change) => {
    const data = change.doc.data() as Group;

    if (data.lastNotified && data.lastTimestamp <= data.lastNotified) {
      console.log("No new messages to notify for group: ", data);
      return;
    }

    if (change.type === "added") {
      console.log("New group: ", data);

      for (const member of data.members.filter((m) => m !== data.lastSender)) {
        const message = buildNewMatchNotification();
        const tokens = await getTokensById(member);
        if (tokens.length === 0) {
          console.log("No tokens for user: ", member);
          continue;
        }
        await sendMessages(message, tokens);
      }
    } else if (change.type === "modified") {
      console.log("Modified group: ", data);

      for (const member of data.members.filter((m) => m !== data.lastSender)) {
        const message = buildNewMessageNotification();
        const tokens = await getTokensById(member);
        if (tokens.length === 0) {
          console.log("No tokens for user: ", member);
          continue;
        }
        await sendMessages(message, tokens);
      }
    } else if (change.type === "removed") {
      console.log("Removed group: ", data);
      return;
    }

    const groupId = data.id;
    const groupRef = db.collection(GROUP_COLLECTION_NAME).doc(groupId);
    await groupRef.update({ lastNotified: FieldValue.serverTimestamp() });
  });
}

function buildNewMatchNotification(): Notification {
  return {
    title: "New Match",
    body: "You have a new match!",
    android: {
      channelId: MESSAGE_CHANNEL_ID,
    },
  };
}

function buildNewMessageNotification(): Notification {
  return {
    title: "New Message",
    body: "You have a new message!",
    android: {
      channelId: MESSAGE_CHANNEL_ID,
    },
  };
}

async function sendMessages(message: Notification, receivers: string[]) {
  const m = { data: { notifee: JSON.stringify(message) }, tokens: receivers };

  try {
    const response = await getMessaging().sendEachForMulticast(m);
    console.log("Successfully sent message:", response);

    response.responses.forEach((resp, index) => {
      if (!resp.success) {
        console.error("Failed to send to token:", receivers[index], resp.error);
        if (resp.error?.code === TOKEN_NOT_REGISTERED && receivers[index]) {
          deleteToken(receivers[index]);
        }
      }
    });
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

async function getTokensById(uid: string): Promise<string[]> {
  const db = getFirestore();
  const notificationsRef = db.collection(NOTIFICATION_COLLECTION_NAME);
  const snapshot = await notificationsRef.where("uid", "==", uid).get();
  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs
    .map((doc) => doc.data() as NotificationData)
    .map((data) => data.token);
}

export async function removeOldTokens() {
  const db = getFirestore();
  const notificationsRef = db.collection(NOTIFICATION_COLLECTION_NAME);
  const snapshot = await notificationsRef
    .where("timestamp", "<", Date.now() - TOKEN_EXPIRATION_TIME)
    .get();
  if (snapshot.empty) {
    console.log("No old tokens to remove.");
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log("Removed old tokens.");
}

async function deleteToken(token: string) {
  const db = getFirestore();
  const notificationsRef = db
    .collection(NOTIFICATION_COLLECTION_NAME)
    .doc(token);
  await notificationsRef.delete();
}
