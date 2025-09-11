import type { Timestamp } from "firebase-admin/firestore";

export type NotificationData = {
  uid: string;
  token: string;
  timestamp: Timestamp;
};

export type Group = {
  id: string;
  name: string | null;
  members: string[];
  lastTimestamp: Timestamp;
  lastMessage: string | null;
  lastSender: string | null;
  lastNotified: Timestamp;
};
