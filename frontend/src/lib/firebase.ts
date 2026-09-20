import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Config pública del SDK web — no es secreta (la seguridad la da Firebase
// Security Rules / App Check, no ocultar esta key). Generada con
// `firebase apps:sdkconfig WEB` para el proyecto "cabrasgo".
const firebaseConfig = {
  apiKey: "AIzaSyCRUCP1MgjWhbiei2K7ULWJDu-3VdVjkzw",
  authDomain: "cabrasgo.firebaseapp.com",
  projectId: "cabrasgo",
  storageBucket: "cabrasgo.firebasestorage.app",
  messagingSenderId: "772190560",
  appId: "1:772190560:web:32d0c3a3581a760f8dae05",
  measurementId: "G-8WKERBFWEV",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
