import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebase";
import { ENDPOINTS, apiFetch } from "../config/api";

const FB_MESSAGES = {
  "auth/email-already-in-use": "Ya existe una cuenta con ese correo.",
  "auth/weak-password": "La contraseña es demasiado débil.",
  "auth/invalid-email": "El correo no es válido.",
  "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.",
  "auth/network-request-failed": "Error de red. Revisa tu conexión.",
};

const LOCAL_FALLBACK_CODES = [
  "auth/invalid-credential",
  "auth/user-not-found",
  "auth/wrong-password",
];

const fbError = (err) =>
  new Error(FB_MESSAGES[err.code] ?? "No fue posible continuar.");

async function exchange(firebaseUser, nombre) {
  const idToken = await firebaseUser.getIdToken();
  return apiFetch(ENDPOINTS.AUTH_FIREBASE, {
    method: "POST",
    body: { id_token: idToken, nombre },
    auth: false,
  });
}

export async function loginWithEmail(correo, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, correo, password);
    return await exchange(cred.user);
  } catch (err) {
    if (LOCAL_FALLBACK_CODES.includes(err.code)) {
      return apiFetch(ENDPOINTS.AUTH_LOGIN, {
        method: "POST",
        body: { correo, password },
        auth: false,
      });
    }
    if (err.code) throw fbError(err);
    throw err;
  }
}

export async function registerWithEmail(nombre, correo, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, correo, password);
    await updateProfile(cred.user, { displayName: nombre });
    return await exchange(cred.user, nombre);
  } catch (err) {
    if (err.code) throw fbError(err);
    throw err;
  }
}

export async function loginWithGoogle() {
  try {
    const cred = await signInWithPopup(auth, new GoogleAuthProvider());
    return await exchange(cred.user);
  } catch (err) {
    if (err.code === "auth/popup-closed-by-user") return null;
    if (err.code) throw fbError(err);
    throw err;
  }
}

export const firebaseSignOut = () => signOut(auth).catch(() => {});