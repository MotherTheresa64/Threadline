import {initializeApp, getApps} from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import {initials, normalizeEmail, requireText, validateEmail, ValidationError} from './validation';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseReady = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

const appClient = () => getApps()[0] ?? initializeApp(config);
export function authClient() { return firebaseReady ? getAuth(appClient()) : null; }
export function dbClient() { return firebaseReady ? getFirestore(appClient()) : null; }

export async function signInGoogle() {
  const auth = authClient();
  if (!auth) throw new Error('Firebase is not configured.');
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signInEmail(email: string, password: string) {
  const auth = authClient();
  if (!auth) throw new Error('Firebase is not configured.');
  return signInWithEmailAndPassword(auth, validateEmail(email), requireText(password, 'Password', 256, 6));
}

export async function registerEmail(name: string, email: string, password: string) {
  const auth = authClient();
  if (!auth) throw new Error('Firebase is not configured.');
  const displayName = requireText(name, 'Name', 80, 2);
  const credential = await createUserWithEmailAndPassword(auth, validateEmail(email), requireText(password, 'Password', 256, 8));
  await updateProfile(credential.user, {displayName});
  return credential;
}

export async function resetPassword(email: string) {
  const auth = authClient();
  if (!auth) throw new Error('Firebase is not configured.');
  await sendPasswordResetEmail(auth, validateEmail(email));
}

export async function signOutUser() {
  const auth = authClient();
  if (auth) await signOut(auth);
}

export function watchAuth(callback: (user: User | null) => void): () => void {
  const auth = authClient();
  return auth ? onAuthStateChanged(auth, callback) : () => {};
}

export function authUserProfile(user: User) {
  const email = normalizeEmail(user.email || '');
  const name = user.displayName?.trim() || email.split('@')[0] || 'Threadline user';
  return {
    id: user.uid,
    name,
    email,
    initials: initials(name),
    avatar: user.photoURL || undefined,
  };
}

export function authErrorMessage(error: unknown): string {
  if (error instanceof ValidationError) return error.message;
  const code = typeof error === 'object' && error && 'code' in error ? String((error as {code?: unknown}).code) : '';
  const known: Record<string, string> = {
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/email-already-in-use': 'An account already exists for that email.',
    'auth/weak-password': 'Use a stronger password with at least 8 characters.',
    'auth/popup-closed-by-user': 'Google sign-in was closed before it finished.',
    'auth/popup-blocked': 'The browser blocked the Google sign-in popup.',
    'auth/too-many-requests': 'Too many attempts. Try again later or reset the password.',
    'auth/network-request-failed': 'The authentication service could not be reached.',
  };
  return known[code] || 'Authentication could not be completed. Please try again.';
}
