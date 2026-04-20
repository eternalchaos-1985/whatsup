require('dotenv').config();
const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

let db = null;
let auth = null;
let messaging = null;

if (projectId && clientEmail && privateKey) {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
  db = admin.firestore();
  auth = admin.auth();
  messaging = admin.messaging();
  console.log('[Firebase] Initialized with project:', projectId);
} else {
  console.warn('[Firebase] Missing credentials — Firebase features disabled. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars.');

  // Provide stubs so services don't crash on import
  const stubCollection = () => ({
    doc: () => ({ get: async () => ({ exists: false }), set: async () => ({}) }),
    add: async () => ({ id: 'stub' }),
    orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }),
  });
  db = { collection: stubCollection };
  auth = {};
  messaging = {
    send: async () => { throw new Error('Firebase not configured'); },
    subscribeToTopic: async () => ({ successCount: 0 }),
    unsubscribeFromTopic: async () => ({ successCount: 0 }),
  };
}

module.exports = { admin, db, auth, messaging };