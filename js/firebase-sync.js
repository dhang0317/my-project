import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyA1mGOdJbVljGaQHj4Sjvomj3Pigpc9Cvs',
  authDomain: 'francais-55691.firebaseapp.com',
  projectId: 'francais-55691',
  storageBucket: 'francais-55691.firebasestorage.app',
  messagingSenderId: '394450809963',
  appId: '1:394450809963:web:cc91e410bf87b3427f2d2e',
  measurementId: 'G-M4CW8J99HD'
};

const app = initializeApp(firebaseConfig);
try {
  getAnalytics(app);
} catch (_) {
  // Analytics may be unavailable in offline or restricted environments
}

const db = getFirestore(app);
const LIBRARY_DOC_REF = doc(db, 'atelier_library', 'default');

let lastSavedHash = '';
let remoteCallback = null;

function hashArticles(articles) {
  try {
    return JSON.stringify(articles);
  } catch (_) {
    return '';
  }
}

async function saveArticlesToCloud(articles) {
  if (!Array.isArray(articles) || articles.length === 0) return;
  const serialized = hashArticles(articles);
  if (serialized === lastSavedHash) return;
  lastSavedHash = serialized;

  try {
    await setDoc(
      LIBRARY_DOC_REF,
      {
        articles,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[FirebaseSync] 雲端儲存失敗（離線或權限不足）：', err.message);
  }
}

function startRealtimeSync(onUpdate, getLocalArticles) {
  remoteCallback = onUpdate;
  try {
    onSnapshot(
      LIBRARY_DOC_REF,
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data.articles) && data.articles.length > 0) {
            const incomingHash = hashArticles(data.articles);
            if (incomingHash !== lastSavedHash) {
              lastSavedHash = incomingHash;
              if (typeof remoteCallback === 'function') {
                remoteCallback(data.articles);
              }
            }
          }
        } else if (typeof getLocalArticles === 'function') {
          const local = getLocalArticles();
          if (Array.isArray(local) && local.length > 0) {
            saveArticlesToCloud(local);
          }
        }
      },
      err => {
        console.warn('[FirebaseSync] 無法監聽 Firestore（離線或尚未開啟規則）：', err.message);
      }
    );
  } catch (err) {
    console.warn('[FirebaseSync] 初始化即時同步失敗：', err.message);
  }
}

window.FirebaseSync = {
  saveArticles: saveArticlesToCloud,
  startRealtimeSync
};

window.dispatchEvent(new CustomEvent('firebase-sync-ready'));
