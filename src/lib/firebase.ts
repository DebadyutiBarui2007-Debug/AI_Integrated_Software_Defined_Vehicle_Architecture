import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInAnonymously,
  onAuthStateChanged
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signOut,
  signInAnonymously,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  deleteDoc,
  serverTimestamp
};

export type { User } from "firebase/auth";
