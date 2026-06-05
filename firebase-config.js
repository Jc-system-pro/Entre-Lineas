// ==========================================================================
// 🔥 CONFIGURACIÓN FIREBASE
// Proyecto: entrelineas-colegio
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyASLUwgw3d72xL4NAn68E610uVV02LUP-U",
    authDomain: "entrelineas-colegio.firebaseapp.com",
    databaseURL: "https://entrelineas-colegio-default-rtdb.firebaseio.com",
    projectId: "entrelineas-colegio",
    storageBucket: "entrelineas-colegio.firebasestorage.app",
    messagingSenderId: "352057290932",
    appId: "1:352057290932:web:0ff6d1418cd9cc2d1727e1"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
