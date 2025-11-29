import moment from "moment"
import User, { userInputType, userType, userTypeMongo } from "../../models/user"
import { comparePass, hashPass, signTokens } from "../../shared/utility"
import generator from "generate-password"
import nodemailer from "nodemailer"

import {
  emailErrors,
  iconErrors,
  nameErrors,
  passConfirmErrors,
  passwordErrors,
  profilePictureErrors,
  throwError,
  userErrors,
} from "./resolverErrors"
import { AuthRequest } from "../../middleware/auth"

const userResolvers = {
  createUser: async (args: { userInput: userInputType }): Promise<userType> => {
    try {
      const { name, email, password, passConfirm, icon, profile_picture } = args.userInput

      // Check for errors.
      await nameErrors(name)
      await emailErrors(email)
      passwordErrors(password, passConfirm)
      passConfirmErrors(passConfirm, password)
      iconErrors(icon, profile_picture)
      profilePictureErrors(profile_picture, icon)

      // Create a new user DB object.
      const user = new User(
        {
          name,
          email,
          icon,
          profile_picture,
          password: await hashPass(password as string),
        },
        (err: string) => {
          if (err) throw new Error(err)
        },
      )

      // Save the new user to the DB.
      await user.save()

      // Return the new user with tokens.
      return {
        ...user._doc,
        tokens: signTokens(user),
        password: null,
      }
    } catch (err) {
      throw err
    }
  },
  login: async ({ email, password }: userInputType): Promise<userType> => {
    try {
      const user = (await User.findOne({ email })) as userTypeMongo
      userErrors(user)

      if (!password) {
        throwError("password", user, "No password entry.")
      } else if (user.password && !(await comparePass(password, user.password))) {
        throwError("password", user, "Incorrect password.")
      }

      user.logged_in_at = moment().format()
      await user.save()

      return {
        ...user._doc,
        tokens: signTokens(user),
        password: null,
      }
    } catch (err) {
      throw err
    }
  },
  forgot: async ({ email }: { email: string }): Promise<string> => {
    try {
      const user = (await User.findOne({ email })) as userTypeMongo

      if (!user) {
        return "Forgot request submitted."
      }

      const randomPass = generator.generate({
        length: 10,
        numbers: true,
        strict: true,
      })

      const transporter = nodemailer.createTransport({
        host: process.env.NODEMAILER_HOST,
        port: 465,
        secure: true, // use SSL.
        auth: {
          user: process.env.NODEMAILER_EMAIL,
          pass: process.env.NODEMAILER_PASS,
        },
      })

      transporter.verify((err) => {
        if (err) {
          console.error(err)
        }
      })

      const mail = {
        from: process.env.NODEMAILER_EMAIL,
        to: email,
        subject: "P10-Game Password Reset",
        text: `
        Your password is now: 
        ${randomPass}

        If you did not expect this email contact maxcrosby118@gmail.com immediately! 🚨
        `,
      }

      user.password = await hashPass(randomPass as string)
      user.updated_at = moment().format()
      await user.save()

      transporter.sendMail(mail, (err) => {
        if (err) {
          console.error(err)
        }
      })

      return "Forgot request submitted."
    } catch (err) {
      throw err
    }
  },
  updatePP: async (
    { icon, profile_picture }: { icon: string; profile_picture: string },
    req: AuthRequest,
  ): Promise<userType> => {
    if (!req.isAuth) {
      throwError("updatePP", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      user.icon = icon
      user.profile_picture = profile_picture
      user.updated_at = moment().format()

      await user.save()

      return {
        ...user._doc,
        tokens: req.tokens,
        password: null,
      }
    } catch (err) {
      throw err
    }
  },
  updateEmail: async ({ email }: { email: string }, req: AuthRequest): Promise<userType> => {
    if (!req.isAuth) {
      throwError("updateEmail", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)
      await emailErrors(email, user)

      user.email = email
      user.updated_at = moment().format()

      await user.save()

      return {
        ...user._doc,
        tokens: req.tokens,
        password: null,
      }
    } catch (err) {
      throw err
    }
  },
  updateName: async ({ name }: { name: string }, req: AuthRequest): Promise<userType> => {
    if (!req.isAuth) {
      throwError("updateName", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)
      await nameErrors(name, user)

      user.name = name
      user.updated_at = moment().format()

      await user.save()

      return {
        ...user._doc,
        tokens: req.tokens,
        password: null,
      }
    } catch (err) {
      throw err
    }
  },
  updatePassword: async (
    {
      currentPass,
      password,
      passConfirm,
    }: {
      currentPass: string
      password: string
      passConfirm: string
    },
    req: AuthRequest,
  ): Promise<userType> => {
    if (!req.isAuth) {
      throwError("updatePassword", req.isAuth, "Not Authenticated!", 401)
    }

    try {
      const user = (await User.findById(req._id)) as userTypeMongo
      userErrors(user)

      if (!currentPass) {
        throwError("currentPass", user, "No current password entry.")
      } else if (user.password && !(await comparePass(currentPass, user.password))) {
        throwError("currentPass", user, "Incorrect password.")
      }

      passwordErrors(password, passConfirm)
      passConfirmErrors(passConfirm, password)

      const transporter = nodemailer.createTransport({
        host: process.env.NODEMAILER_HOST,
        port: 465,
        secure: true, // use SSL.
        auth: {
          user: process.env.NODEMAILER_EMAIL,
          pass: process.env.NODEMAILER_PASS,
        },
      })

      transporter.verify((err) => {
        if (err) {
          console.error(err)
        }
      })

      const mail = {
        from: process.env.NODEMAILER_EMAIL,
        to: user.email,
        subject: "P10-Game Password Change",
        text: `
        Your password has been changed.

        If you did not expect this email contact maxcrosby118@gmail.com immediately! 🚨
        `,
      }

      transporter.sendMail(mail, (err) => {
        if (err) {
          console.error(err)
        }
      })

      user.password = await hashPass(password as string)
      user.updated_at = moment().format()

      await user.save()

      return {
        ...user._doc,
        tokens: req.tokens,
        password: null,
      }
    } catch (err) {
      throw err
    }
  },
}

export default userResolvers
