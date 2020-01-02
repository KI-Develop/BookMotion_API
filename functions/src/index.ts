import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import axios from 'axios'

admin.initializeApp(functions.config().firebase)

const db = admin.firestore()

type SearchData = {
  selfLink: string
  title?: string
  authors?: Array<string>
  description?: string
  bookImage?: string
  publishedDate?: string
  publisher?: string
  totalPageCount?: number
}

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

export async function getGoogleBooks(keyword: string): Promise<any> {
  const url = 'https://www.googleapis.com/books/v1/volumes'
  const res = await axios.get(url, {
    params: {
      q: keyword,
      maxResults: 40
    }
  })
  return res
}

export const googleBooksApi = functions.https.onRequest(
  async (request, response) => {
    const items: SearchData[] = []

    if (request.query.keyword === undefined) {
      response.status(400).send('keyword is undefined')
    } else {
      const keyword: string = request.query.keyword

      await getGoogleBooks(keyword).then(res => {
        if (res.data.items) {
          for (const [index, item] of res.data.items.entries()) {
            if (item.volumeInfo) {
              items.push({
                selfLink: item.selfLink,
                title: item.volumeInfo.title || '',
                authors: item.volumeInfo.authors || [],
                description: item.volumeInfo.description || '',
                publishedDate: item.volumeInfo.publishedDate || '',
                publisher: item.volumeInfo.publisher || '',
                totalPageCount: item.volumeInfo.pageCount || 0
              })

              if (item.volumeInfo.imageLinks) {
                items[index].bookImage = item.volumeInfo.imageLinks.thumbnail
              }
            }
          }
        }
      })
      //TODO: firestoreからselfLinkが一致しているかを条件にして、一致していた場合は、重複していることがわかるようにパラメーターをつける.
      if (items.length) {
        response.status(200).send(items)
      } else {
        response.status(200).send('No items')
      }
    }
  }
)
