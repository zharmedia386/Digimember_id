const firebase = require("firebase");
const firebaseConfig = {
  apiKey: "AIzaSyCnii7QCWf_ln0WvkeAPBN9p3xUCAQIzbs",
  authDomain: "digimember-3166a.firebaseapp.com",
  projectId: "digimember-3166a",
  storageBucket: "digimember-3166a.appspot.com",
  messagingSenderId: "1076910703361",
  appId: "1:1076910703361:web:881074076f9a8d9ef71100"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const User = db.collection("Users");
module.exports = User;
