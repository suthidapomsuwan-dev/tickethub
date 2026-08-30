import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyANqpiKTk9cV1jHbGg14eL3X2wOMPf4u1Y",
  authDomain: "tickethub-85627.firebaseapp.com",
  databaseURL: "https://tickethub-85627-default-rtdb.firebaseio.com",
  projectId: "tickethub-85627",
  storageBucket: "tickethub-85627.firebasestorage.app",
  messagingSenderId: "32849632743",
  appId: "1:32849632743:web:2445f8897f2a4225e8b142"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);