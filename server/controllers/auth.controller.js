import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserModel from "../models/user.model.js";
import {
  createResponse,
  generateAccessToken,
  generateRefreshToken,
} from "../utils/helper.js";
import { HTTP_STATUS } from "../config/constants.js";

const AuthController = {
  // Register new user
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await UserModel.findUserByEmail(email);
      if (existingUser) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "User already exists with this email"));
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = await UserModel.createUser({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        hashedPassword,
        role: "student",
      });

      if(!newUser) {
        throw new Error("User creation failed")
      }
      // Generate tokens
      const accessToken = generateAccessToken(newUser);
      const refreshToken = generateRefreshToken(newUser);

      // Set refresh token cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(HTTP_STATUS.OK).json(
        createResponse(true, "User registered successfully", {
          user:{
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
          },
          accessToken,
        })
      );
    } catch (error) {
      console.error("Register error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Registration failed",null,{error:error.message}));
    }
  },

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await UserModel.findUserByEmail(email.toLowerCase().trim());
      if (!user) {
        return res
          .status(HTTP_STATUS.UNAUTHORIZED)
          .json(createResponse(false, "Invalid credentials"));
      }

      // Check if user is active
      if (!user.is_active) {
        return res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(createResponse(false, "Account is deactivated"));
      }

      // Check password (skip for OAuth users)
      if (!user.password_hash) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "This email is registered via OAuth. Please log in with Google."));
      }

      const isValidPassword = await bcrypt.compare(
        password,
        user.password_hash
      );
      if (!isValidPassword) {
        return res
          .status(HTTP_STATUS.UNAUTHORIZED)
          .json(createResponse(false, "Invalid credentials"));
      }

      // Update last login
      await UserModel.updateLastLogin(user.id);

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Set refresh token cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Remove password from response
      const { password_hash, ...userWithoutPassword } = user;

      res.json(
        createResponse(true, "Login successfully", {
          user: userWithoutPassword,
          accessToken,
        })
      );
    } catch (error) {
      console.error("Login error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Login failed"));
    }
  },

  // Refresh token endpoint
  async refreshToken(req, res) {
    const token = req.cookies.refreshToken;

    if (!token)
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(createResponse(false, "No refresh token"));
    try {
      const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const user = await UserModel.findUserById(payload.id);
      if (!user)
        return res
          .status(HTTP_STATUS.UNAUTHORIZED)
          .json(createResponse(false, "Invalid refresh token"));
      const accessToken = generateAccessToken(user);
      res.json(createResponse(true, "Token refreshed", { accessToken }));
    } catch (err) {
      res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(createResponse(false, "Invalid or expired refresh token"));
    }
  },

  // Logout user
  async logout(req, res) {
    try {
      res.clearCookie("refreshToken");
      res.json(createResponse(true, "Logged out successfully"));
    } catch (error) {
      console.error("Logout error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Logout failed"));
    }
  },

  // Get current user
  async getCurrentUser(req, res) {
    try {
      const user = await UserModel.findUserById(req.user.id);

      if (!user) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "User not found"));
      }

      res.json(createResponse(true, "User retrieved successfully", user));
    } catch (error) {
      console.error("Get current user error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to get user"));
    }
  },

  // OAuth google
  async googleCallback(req, res) {
    try {
      // User is already authenticated by passport at this point
      const user = req.user;

      if (!user) {
        return res
          .status(HTTP_STATUS.UNAUTHORIZED)
          .json(createResponse(false, "Authentication failed"));
      }

      const existingEmail = await UserModel.findUserByEmail(user.email);

      if (existingEmail && existingEmail.oauth_provider !== "google") {
        return res
         .status(HTTP_STATUS.BAD_REQUEST)
         .json(
          createResponse(
           false,
           "Email already exists"
          )
         );
      }
      // Update last login
      await UserModel.updateLastLogin(user.id);

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Set refresh token cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Redirect to frontend with access token
      // You can either redirect with a token parameter or to a specific route
      // where your frontend can exchange the session for tokens
      res.redirect(
        `${process.env.CLIENT_URL}/oauth-callback?token=${accessToken}`
      );
    } catch (error) {
      console.error("Google OAuth error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "OAuth authentication failed"));
    }
  },

  // Handle OAuth failure
  oauthFailure(req, res) {
    res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(createResponse(false, "OAuth authentication failed"));
  },
};

export default AuthController;