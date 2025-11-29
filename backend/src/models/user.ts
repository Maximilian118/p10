import mongoose from "mongoose"
import moment from "moment"
import { ObjectId } from "mongodb"

export interface userInputType {
  name: string
  email: string
  password: string | null
  passConfirm: string
  icon?: string
  profile_picture?: string
}

export interface userType extends userInputType {
  _id: ObjectId
  championships: object[]
  badges: {
    badge: ObjectId
    dateTime: string
  }[]
  permissions: {
    admin: boolean
    adjudicator: boolean
    guest: boolean
  }
  refresh_count: number
  logged_in_at: string
  created_at: string
  updated_at: string
  tokens: string[]
  _doc: userType
}

export interface userTypeMongo extends userType {
  save: () => Promise<{}>
}

const userSchema = new mongoose.Schema<userType>({
  name: { type: String, required: true }, // User Name.
  email: { type: String, required: true }, // User Email.
  password: { type: String, required: false, min: 8 }, // User encryptied password.
  icon: { type: String, required: false, default: "" }, // User Icon. Same image as Profile Picture but compressed to aprox 0.05mb.
  profile_picture: { type: String, required: false, default: "" }, // User Profile Picture. Compressed to aprox 0.5mb.
  championships: [{ type: mongoose.Schema.ObjectId, ref: "Champ" }], // Array of Championships the User has created.
  badges: [
    {
      badge: { type: mongoose.Schema.ObjectId, ref: "Badge" }, // Badge object.
      dateTime: { type: String, default: moment().format() }, // dateTime user won this Badge.
    },
  ],
  refresh_count: { type: Number, default: 0 }, // Refresh count.
  logged_in_at: { type: String, default: moment().format() }, // Last logged in.
  created_at: { type: String, default: moment().format() }, // When the user signed up.
  updated_at: { type: String, default: moment().format() }, // Last user activity.
  permissions: {
    admin: { type: Boolean, default: false },
    adjudicator: { type: Boolean, default: false },
    guest: { type: Boolean, default: false },
  },
})

const User = mongoose.model<userType>("User", userSchema)

export default User
