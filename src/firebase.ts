// Mocking Firebase with Local Storage for demo purposes since Firebase was declined.
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  tenantId: string | null;
  providerData: {
    providerId: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  }[];
}

const STORAGE_KEYS = {
  renders: 'reposcripter_renders',
  prompts: 'reposcripter_prompts'
};
const USER_KEY = 'reposcripter_user';

export const db = {
  // Dummy db object for type compatibility
};

export const auth = {
  currentUser: null as User | null,
};

export const googleProvider = {};

export async function signInWithPopup(...args: any[]) {
  const mockUser: User = {
    uid: 'local-user-' + Math.random().toString(36).substr(2, 9),
    email: 'local@example.com',
    displayName: 'Local Alchemist',
    photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=Local',
    emailVerified: true,
    isAnonymous: false,
    tenantId: null,
    providerData: []
  };
  localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
  window.location.reload(); // Refresh to trigger state change
  return { user: mockUser };
}

export async function signOut(...args: any[]) {
  localStorage.removeItem(USER_KEY);
  window.location.reload();
}

export function onAuthStateChanged(authInstance: any, callback: (user: User | null) => void) {
  const savedUser = localStorage.getItem(USER_KEY);
  if (savedUser) {
    const user = JSON.parse(savedUser);
    auth.currentUser = user;
    callback(user);
  } else {
    callback(null);
  }
  return () => {};
}

// Mock Firestore functions
export function collection(db: any, path: string) {
  return path;
}

export async function addDoc(colPath: string, data: any) {
  const key = STORAGE_KEYS[colPath as keyof typeof STORAGE_KEYS] || STORAGE_KEYS.renders;
  const current = JSON.parse(localStorage.getItem(key) || '[]');
  const newItem = {
    id: Math.random().toString(36).substr(2, 9),
    ...data,
    createdAt: {
      seconds: Date.now() / 1000
    }
  };
  localStorage.setItem(key, JSON.stringify([newItem, ...current]));
  window.dispatchEvent(new Event('storage'));
  return { id: newItem.id };
}

export async function deleteDoc(docRef: any) {
  const { colPath, id } = docRef;
  const key = STORAGE_KEYS[colPath as keyof typeof STORAGE_KEYS] || STORAGE_KEYS.renders;
  const current = JSON.parse(localStorage.getItem(key) || '[]');
  const filtered = current.filter((item: any) => item.id !== id);
  localStorage.setItem(key, JSON.stringify(filtered));
  window.dispatchEvent(new Event('storage'));
}

export function query(colPath: string, ...constraints: any[]) {
  return colPath;
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: string) {
  return { type: 'orderBy', field, direction };
}

export function limit(n: number) {
  return { type: 'limit', n };
}

export function onSnapshot(q: any, onNext: (snapshot: any) => void, onError?: (error: any) => void) {
  const colPath = q;
  const key = STORAGE_KEYS[colPath as keyof typeof STORAGE_KEYS] || STORAGE_KEYS.renders;

  const load = () => {
    const rawItems = JSON.parse(localStorage.getItem(key) || '[]');
    const items = rawItems.map((item: any) => ({
      ...item,
      createdAt: {
        toDate: () => new Date((item.createdAt?.seconds ?? Date.now() / 1000) * 1000),
        seconds: item.createdAt?.seconds ?? Date.now() / 1000
      }
    }));
    onNext({
      forEach: (callback: (doc: any) => void) => {
        items.forEach((item: any) => callback({ id: item.id, data: () => item }));
      }
    });
  };
  load();
  window.addEventListener('storage', load);
  return () => window.removeEventListener('storage', load);
}

export function serverTimestamp() {
  return { seconds: Date.now() / 1000 };
}

export async function getDocFromServer() {
  return { exists: () => true };
}

export function doc(db: any, colPath: string, id: string) {
  return { colPath, id };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: any) {
  console.error("Local Storage Error:", error);
}
