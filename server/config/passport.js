import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import UserModel from "../models/user.model.js";

dotenv.config();



// Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}${process.env.GOOGLE_CALLBACK_URL}`,
      scope: ["profile", "email"],
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if the user already exists in the database
        let user = await UserModel.findUserByOAuthId(profile.id);

        if (user) {
          // User already exists, return the user object
          return done(null, user);
        }
        // User does not exist, create a new user
        const newUser = {
          name: profile.displayName,
          email: profile.emails[0].value,
          oauthProvider: profile.provider,
          oauthId: profile.id,
          avatarUrl: profile.photos[0].value,
        };
 
        user = await UserModel.createOAuthUser(newUser);
        return done(null, user);
      } catch (error) {
        console.error("Error during Google OAuth authentication:", error);
        return done(error, null);
      }
    }
  )
);

// Serialize user object to session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user object from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserModel.findUserById(id);
    done(null, user);
  }catch (error) {
    done(error, null);
  }
})
export default passport;