import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase-config.js';
import { DEFAULT_SKILLS } from './seed-data.js';

const COLLECTION_NAME = 'skills';

export async function fetchSkills() {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return DEFAULT_SKILLS;
    }
    const list = [];
    snapshot.forEach((snap) => {
      list.push({ id: snap.id, ...snap.data() });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
    return DEFAULT_SKILLS;
  }
}

export async function saveSkill(id, skillData) {
  try {
    const docId = id || 'skill_' + Date.now();
    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(docRef, skillData, { merge: true });
    return { success: true, id: docId };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
    return { success: false, error: error.message };
  }
}

export async function removeSkill(id) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    return { success: false, error: error.message };
  }
}
