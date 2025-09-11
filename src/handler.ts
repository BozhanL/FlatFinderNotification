import type { Notification } from "@notifee/react-native";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

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
        sendMessages(message, tokens);
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
        sendMessages(message, tokens);
      }
    } else if (change.type === "removed") {
      console.log("Removed group: ", data);
      return;
    }

    const groupId = data.id;
    const groupRef = db.collection("groups").doc(groupId);
    await groupRef.update({ lastNotified: FieldValue.serverTimestamp() });
  });
}

function buildNewMatchNotification(): Notification {
  return {
    title: "New Match",
    body: "You have a new match!",
    android: {
      channelId: "messages",
    },
  };
}

function buildNewMessageNotification(): Notification {
  return {
    title: "New Message",
    body: "You have a new message!",
    android: {
      channelId: "messages",
    },
  };
}

function sendMessages(message: Notification, receivers: string[]) {
  const m = { data: { notifee: JSON.stringify(message) }, tokens: receivers };
  getMessaging()
    .sendEachForMulticast(m)
    .then((response) => {
      // Response is a message ID string.
      console.log("Successfully sent message:", response);
    })
    .catch((error) => {
      console.log("Error sending message:", error);
    });
}

async function getTokensById(uid: string): Promise<string[]> {
  const db = getFirestore();
  const notificationsRef = db.collection("notifications");
  const snapshot = await notificationsRef.where("uid", "==", uid).get();
  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs
    .map((doc) => doc.data() as NotificationData)
    .map((data) => data.token);
}

type NotificationData = {
  uid: string;
  token: string;
  timestamp: Timestamp;
};

type Group = {
  id: string;
  name: string | null;
  members: string[];
  lastTimestamp: Timestamp;
  lastMessage: string;
  lastSender: string;
  lastNotified: Timestamp;
};
