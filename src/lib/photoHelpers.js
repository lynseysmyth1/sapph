import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './firebase'

/**
 * Compress/resize an image file before upload.
 * Returns a Blob (JPEG) or the original file if compression fails.
 */
export function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob((blob) => {
          resolve(blob || file)
        }, 'image/jpeg', quality)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Upload new (blob:) photos to Firebase Storage in parallel.
 * Returns an array of download URLs in order.
 *
 * @param {object} profileRef  - Firestore document reference (unused here but kept for API parity)
 * @param {string[]} photosToUpload - Array of URLs (blob: ones will be uploaded)
 * @param {File[]} photoFiles  - Compressed file blobs aligned with photosToUpload blob entries
 * @param {string} userId
 * @returns {Promise<string[]>} Final download URLs for uploaded photos
 */
export async function uploadPhotos(photosToUpload, photoFiles, userId) {
  const uploadPromises = []
  let fileIdx = 0

  for (const url of photosToUpload) {
    if (url.startsWith('blob:') && photoFiles[fileIdx]) {
      const file = photoFiles[fileIdx]
      const idx = fileIdx

      const uploadPromise = (async () => {
        try {
          const fileName = `${Date.now()}-${idx}.jpg`
          const storageRef = ref(storage, `profile-photos/${userId}/${fileName}`)
          await uploadBytes(storageRef, file)
          const downloadURL = await getDownloadURL(storageRef)
          return { index: idx, url: downloadURL }
        } catch (err) {
          console.error('[photoHelpers] Upload error:', err)
          return null
        }
      })()

      uploadPromises.push(uploadPromise)
      fileIdx++
    }
  }

  const results = await Promise.all(uploadPromises)
  return results
    .filter(r => r !== null)
    .sort((a, b) => a.index - b.index)
    .map(r => r.url)
}
