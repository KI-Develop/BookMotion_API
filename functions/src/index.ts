import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp(functions.config().firebase)

const db = admin.firestore()

export const registerUser = functions.auth.user().onCreate(user => {
  if (!user) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User is not registered.'
    )
  }
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
      console.error(err)
    })
})

export async function getBookCollection(userId: string) {
  const snapShot = await db
    .collection('books')
    .where('userId', '==', userId)
    .get()
  return snapShot
}

export const deleteUser = functions.auth.user().onDelete(async user => {
  if (!user) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User has not been deleted.'
    )
  }
  const { uid } = user

  await db
    .collection('users')
    .doc(uid)
    .delete()
    .then(() => {
      console.log('User has been deleted.')
    })
    .catch(err => {
      console.error(err)
    })

  await getBookCollection(uid).then(querySnapshot => {
    querySnapshot.forEach(async doc => {
      await db
        .collection('books')
        .doc(doc.id)
        .delete()
        .then(() => {
          console.log('BookData has been deleted.')
        })
        .catch(err => {
          console.error(err)
        })
    })
  })
})
