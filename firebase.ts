import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuration Firebase pour Atlas
const firebaseConfig = {
  apiKey: "AIzaSyAg_SeSqxhN4LQ_I1FRvD7L6qB_wU41OFo",
  authDomain: "atlas-dd27e.firebaseapp.com",
  projectId: "atlas-dd27e",
  storageBucket: "atlas-dd27e.firebasestorage.app",
  messagingSenderId: "433747015154",
  appId: "1:433747015154:web:dee4a3408b1d965de3e76b",
  measurementId: "G-YC4012RZY1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);