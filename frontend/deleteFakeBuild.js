import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const serviceAccount = JSON.parse(readFileSync(resolve('backend/src/main/resources/firebase-service-account.json'), 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function deleteFakeBuilds() {
  const buildsRef = db.collection('builds');
  // Fake #42 build string match
  const snapshot = await buildsRef.where('buildNumber', '==', 42).get();
  
  if (snapshot.empty) {
    console.log('No build 42 found.');
    return;
  }  

  let deletedCount = 0;
  for (const doc of snapshot.docs) {
    await db.collection('builds').doc(doc.id).delete();
    console.log(`Deleted fake build document: ${doc.id}`);
    deletedCount++;
  }
  
  // Also clean up any mock builds that might be named 42 as a string
  const snapshotString = await buildsRef.where('buildNumber', '==', '42').get();
  for (const doc of snapshotString.docs) {
    await db.collection('builds').doc(doc.id).delete();
    console.log(`Deleted fake build document: ${doc.id}`);
    deletedCount++;
  }

  console.log(`Finished deleting ${deletedCount} fake builds.`);
}

deleteFakeBuilds().catch(console.error);
