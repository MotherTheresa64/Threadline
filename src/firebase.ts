import {initializeApp,getApps} from 'firebase/app';
import {getAuth,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signOut,type User} from 'firebase/auth';
import {collection,doc,getFirestore,onSnapshot,query,setDoc,where,type Unsubscribe} from 'firebase/firestore';
import type {Workspace} from './types';

const config={
  apiKey:import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:import.meta.env.VITE_FIREBASE_APP_ID
};

export const firebaseReady=Boolean(config.apiKey&&config.authDomain&&config.projectId&&config.appId);
const appClient=()=>getApps()[0]??initializeApp(config);
export function authClient(){return firebaseReady?getAuth(appClient()):null}
export function dbClient(){return firebaseReady?getFirestore(appClient()):null}
export async function signInGoogle(){const auth=authClient();if(!auth)return null;return signInWithPopup(auth,new GoogleAuthProvider())}
export async function signOutUser(){const auth=authClient();if(auth)await signOut(auth)}
export function watchAuth(callback:(user:User|null)=>void):Unsubscribe|(()=>void){const auth=authClient();return auth?onAuthStateChanged(auth,callback):()=>{}}

export function watchWorkspaces(email:string,onData:(workspaces:Workspace[])=>void,onError:(error:Error)=>void):Unsubscribe|(()=>void){
  const db=dbClient();
  if(!db)return()=>{};
  const normalized=email.trim().toLowerCase();
  return onSnapshot(query(collection(db,'workspaces'),where('memberEmails','array-contains',normalized)),snapshot=>{
    const workspaces=snapshot.docs.map(item=>({...item.data(),id:item.id} as Workspace));
    workspaces.sort((a,b)=>a.name.localeCompare(b.name));
    onData(workspaces);
  },error=>onError(error));
}

export async function saveWorkspace(workspace:Workspace){
  const db=dbClient();
  if(!db)throw new Error('Firebase is not configured.');
  const payload={...workspace,updatedAt:new Date().toISOString()};
  await setDoc(doc(db,'workspaces',workspace.id),payload);
}

export async function createWorkspace(workspace:Workspace){
  const db=dbClient();
  if(!db)throw new Error('Firebase is not configured.');
  await setDoc(doc(db,'workspaces',workspace.id),workspace);
}
