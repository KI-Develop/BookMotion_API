import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp(functions.config().firebase)

export const registerUsers = functions.auth.user().onCreate(user => {
  if (!user) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User is not registered.'
    )
  }
  const db = admin.firestore()
  const { uid } = user

  db.collection('users')
    .doc(uid)
    .set({
      userName: user.displayName,
      photoUrl: user.photoURL,
      email: user.email,
      createAt: admin.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      console.log('Success')
    })
    .catch(err => {
      console.log(err)
    })
})
