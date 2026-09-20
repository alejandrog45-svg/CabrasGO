import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// FIREBASE_SERVICE_ACCOUNT: el JSON completo del service account (Firebase
// Console → Configuración del proyecto → Cuentas de servicio → Generar
// nueva clave privada), pegado tal cual como una sola línea en la variable
// de entorno — mismo patrón ya usado en el bot de WhatsApp de Ferretería
// Oviedo. No requiere reemplazar \n a mano: JSON.parse ya interpreta los
// \n escapados dentro del string.
let app: App | null = null;

export function getFirebaseAdmin(): App {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      "Falta FIREBASE_SERVICE_ACCOUNT en el .env — generar en Firebase Console > Configuración del proyecto > Cuentas de servicio."
    );
  }

  const serviceAccount = JSON.parse(raw);
  app = initializeApp({ credential: cert(serviceAccount) });
  return app;
}

export async function verifyFirebaseIdToken(idToken: string) {
  return getAuth(getFirebaseAdmin()).verifyIdToken(idToken);
}
