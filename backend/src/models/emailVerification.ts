import mongoose, { Document, ObjectId } from "mongoose"

// Stores pending email change requests with verification tokens.
export interface EmailVerificationType extends Document {
  userId: ObjectId
  newEmail: string
  token: string
  expiresAt: Date
  createdAt: Date
}

const emailVerificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  newEmail: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Automatically delete expired verification tokens.
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model<EmailVerificationType>("EmailVerification", emailVerificationSchema)
