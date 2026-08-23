import {initializeApp,getApps} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut} from 'firebase/auth';
const config={apiKey:import.meta.env.VITE_FIREBASE_API_KEY,authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,appId:import.meta.env.VITE_FIREBASE_APP_ID};
export const firebaseReady=Boolean(config.apiKey&&config.authDomain&&config.projectId&&config.appId);
export function authClient(){if(!firebaseReady)return null;const app=getApps()[0]??initializeApp(config);return getAuth(app)}
export async function signInGoogle(){const auth=authClient();if(!auth)return null;return signInWithPopup(auth,new GoogleAuthProvider())}
export async function signOutUser(){const auth=authClient();if(auth)await signOut(auth)}
