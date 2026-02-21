import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAqBY38B5C2SxYmMgDLAw-zvoLcEzsef7I",
  authDomain: "minutri-f9ca0.firebaseapp.com",
  projectId: "minutri-f9ca0",
  storageBucket: "minutri-f9ca0.firebasestorage.app",
  messagingSenderId: "413488863866",
  appId: "1:413488863866:web:db159e002755e9b12379c3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
