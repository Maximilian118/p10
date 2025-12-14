import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { imageErrors, imageUploadErrors, throwError } from "./resolverErrors"
import { clientS3, deleteS3, isDuplicateS3 } from "../../shared/utility"
import { AuthRequest } from "../../middleware/auth"

const bucketResolvers = {
  signS3: async ({ filename }: { filename: string }) => {
    // Not checking for req.auth because signS3 is used to upload create user image.
    try {
      // Check for errors.
      imageUploadErrors(filename)
      // Check if the file already exists in S3.
      const duplicate = await isDuplicateS3(clientS3(), clientS3(filename).params)
      const url = `http://${clientS3().bucket}.s3.${clientS3().region}.amazonaws.com/${filename}`

      // If duplicate exists, return the existing URL without creating a new signed request.
      // This allows the frontend to reuse the existing file.
      if (duplicate) {
        return {
          signedRequest: "",
          url,
          duplicate: true,
        }
      }

      // Create the putObjectCommand for new uploads.
      const command = new PutObjectCommand(clientS3(filename).params)
      // Return signedRequest for upload, image url and the result of the duplicate check.
      return {
        signedRequest: await getSignedUrl(clientS3(), command, { expiresIn: 60 }),
        url,
        duplicate: false,
      }
    } catch (err) {
      throw err
    }
  },
  deleteS3: async ({ url, depth }: { url: string; depth?: number }, req: AuthRequest) => {
    if (!req.isAuth) {
      throwError("deleteS3", req.isAuth, "Not Authenticated!", 401)
    }
    try {
      // Check for errors.
      imageErrors(url)
      // Delete the file.
      // Optionally, depending on depth level, delete the entire folder the file is in or the parent of that folder and so on.
      const deleteErr = await deleteS3(clientS3(), clientS3(url).params, depth)
      // If deleteS3 had any errors.
      if (deleteErr) {
        throw throwError("dropzone", url, deleteErr)
      }

      return {
        url,
        tokens: req.tokens,
      }
    } catch (err) {
      throw err
    }
  },
}

export default bucketResolvers
