const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = 
{
  "type": process.env.FIREBASE_TYPE,
  "project_id": process.env.FIREBASE_PROJECT_ID,
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY,
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": process.env.FIREBASE_AUTH_URI,
  "token_uri": process.env.FIREBASE_TOKEN_URI,
  "auth_provider_x509_cert_url": process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  "client_x509_cert_url": process.env.FIREBASE_CERT_URL,
  "universe_domain": process.env.FIREBASE_UNIVERSE_DOMAIN
}
// Cấu hình Firebase Admin SDK
// const serviceAccount = require(path.resolve(
//   __dirname,
//   firebase_config
// ));



admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "lamba-blog.appspot.com", // Thay bằng Firebase Storage Bucket của bạn
});

const bucket = admin.storage().bucket(); // Firebase Storage Bucket

module.exports = { bucket };
