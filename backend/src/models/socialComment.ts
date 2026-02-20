import mongoose from "mongoose"
import { ObjectId } from "mongodb"
import moment from "moment"

// Comment on a SocialEvent.
export interface SocialCommentType {
  _id: ObjectId
  event: ObjectId
  user: ObjectId
  userSnapshot: {
    name: string
    icon: string
  }
  text: string
  likes: ObjectId[]
  dislikes: ObjectId[]
  created_at: string
}

const socialCommentSchema = new mongoose.Schema<SocialCommentType>({
  event: { type: mongoose.Schema.ObjectId, ref: "SocialEvent", required: true, index: true },
  user: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
  userSnapshot: {
    name: { type: String, required: true },
    icon: { type: String, required: true },
  },
  text: { type: String, required: true, maxlength: 500 },
  likes: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
  dislikes: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
  created_at: { type: String, default: moment().format() },
})

// Index for fetching comments for an event sorted by time.
socialCommentSchema.index({ event: 1, created_at: -1 })

const SocialComment = mongoose.model<SocialCommentType>("SocialComment", socialCommentSchema)

export default SocialComment
