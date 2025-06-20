import bcrypt from "bcryptjs";
import UserModel from "../models/user.model.js";
import { createResponse } from "../utils/helper.js";
import { HTTP_STATUS } from "../config/constants.js";
import { uploadImage, deleteImage } from "../config/cloudinary.js";

export const UserController = {
  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = await UserModel.findUserById(req.user.id);

      if (!user) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "User not found"));
      }

      res.json(createResponse(true, "Profile retrieved successfully", user));
    } catch (error) {
      console.error("Get profile error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to retrieve profile"));
    }
  },

  //Update user profile
  async updateProfile(req, res) {
    try {
      const { name, bio, avatar_url } = req.body;
      const userId = req.user.id;
      
      // Get current user to check for existing image
      const currentUser = await UserModel.findUserById(userId);
      
      // Check if avatar_url is being changed
      if (avatar_url && avatar_url.trim() !== currentUser.avatar_url && currentUser.image_public_id) {
        // If avatar_url is being changed and we have a stored public_id, delete the old image
        try {
          await deleteImage(currentUser.image_public_id);

        } catch (deleteError) {
          console.error("Error deleting old image:", deleteError);
          // Continue with update even if delete fails
        }
      }

      const updatedUser = await UserModel.updateUser(userId, {
        name: name.trim(),
        bio: bio?.trim() || null,
        avatar_url: avatar_url?.trim() || null,
        // Clear the image_public_id if avatar_url is changed manually
        image_public_id: avatar_url && avatar_url.trim() !== currentUser.avatar_url ? null : currentUser.image_public_id
      });

      if (!updatedUser) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "User not found"));
      }

      res.json(
        createResponse(true, "Profile updated successfully", updatedUser)
      );
    } catch (error) {
      console.error("Update profile error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to update profile"));
    }
  },

  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Get user with password
      const user = await UserModel.findUserByEmail(req.user.email);

      if (!user || !user.password_hash) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(
            createResponse(false, "Cannot change password for OAuth users")
          );
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.password_hash
      );
      if (!isValidPassword) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "Current password is incorrect"));
      }

      // Prevent using the same password
      if (currentPassword === newPassword) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(
            createResponse(
              false,
              "New password cannot be the same as the current password"
            )
          );
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const hashedNewPass = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await UserModel.updatePassword(userId, hashedNewPass);

      res.json(createResponse(true, "Password changed successfully"));
    } catch (error) {
      console.error("Change password error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to change password"));
    }
  },

  // Get all users (Admin only)
  async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const users = await UserModel.getAllUsers(limit, offset);

      res.json(
        createResponse(true, "Users retrieved successfully", {
          users,
          pagination: {
            page,
            limit,
            total: users.length,
          },
        })
      );
    } catch (error) {
      console.error("Get all users error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to retrieve users"));
    }
  },

  // Get Users by role (Admin/Instructor)
  async getUsersByRole(req, res) {
    try {
      const { role } = req.params;

      // Validate role
      const validRoles = ["admin", "instructor", "student"];
      if (!validRoles.includes(role)) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "Invalid role"));
      }

      const users = await UserModel.getUserByRole(role);

      res.json(createResponse(true, `${role}s retrieved successfully`, users));
    } catch (error) {
      console.error("Get users by role error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to retrieve users"));
    }
  },

  // Get user by ID (Admin/Instructor)
  async getUsersById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "Invalid user ID"));
      }

      const user = await UserModel.findUserById(parseInt(id));

      if (!user) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "User not found"));
      }

      res.json(createResponse(true, "User retrieved successfully", user));
    } catch (error) {
      console.error("Get user by Id error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to retrieve user"));
    }
  },

  // Toggle user status (Admin only)
  async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "Invalid user ID"));
      }

      //Prevent admin from deactivating themselves
      if (parseInt(id) === req.user.id) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "Cannot modify your own status"));
      }

      const result = await UserModel.toggleUserStatus(parseInt(id));

      if (!result) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "User not found"));
      }

      const status = result.is_active ? "activated" : "deactivated";
      res.json(createResponse(true, `User ${status} successfully`, result));
    } catch (error) {
      console.error("Toggle user status error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to update user status"));
    }
  },

  // Delete user (Admin only)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "Invalid user ID"));
      }

      // Prevent admin from deleting themselves
      if (parseInt(id) === req.user.id) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "Cannot delete your own account"));
      }

      const result = await UserModel.deleteUser(parseInt(id));

      if (!result) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "User not found"));
      }

      res.json(createResponse(true, "User deleted successfully"));
    } catch (error) {
      console.error("Delete user error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to delete user"));
    }
  },

  //Get user statistics (Admin only)
  async getUserStats(req, res) {
    try {
      const stats = await UserModel.getUserStats();

      res.json(
        createResponse(true, "User statistics retrieved successfully", stats)
      );
    } catch (error) {
      console.error("Get user stats error", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to retrieve user statistics"));
    }
  },

  // Upload profile image to Cloudinary
  async uploadProfileImage(req, res) {
    try {
      // Check if file exists in the request
      if (!req.file) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "No image file provided"));
      }

      const userId = req.user.id;
      
      // Get current user to check for existing image
      const currentUser = await UserModel.findUserById(userId);
      
      // Delete old image if it exists
      if (currentUser && currentUser.image_public_id) {
        try {
          await deleteImage(currentUser.image_public_id);

        } catch (deleteError) {
          console.error("Error deleting old image:", deleteError);
          // Continue with upload even if delete fails
        }
      }

      // Convert buffer to base64 for Cloudinary upload
      const fileBuffer = req.file.buffer;
      const fileType = req.file.mimetype;
      const base64String = `data:${fileType};base64,${fileBuffer.toString('base64')}`;

      // Upload image to Cloudinary
      const uploadResult = await uploadImage(base64String, {
        folder: 'profile_images',
        public_id: `user_${userId}_${Date.now()}`,
        overwrite: true,
        resource_type: 'image'
      });

      // Update user's avatar_url and image_public_id in the database
      const updatedUser = await UserModel.updateUser(userId, {
        name: currentUser.name, // Keep existing name
        bio: currentUser.bio, // Keep existing bio
        avatarUrl: uploadResult.secure_url, // Update with new Cloudinary URL
        imagePublic_id: uploadResult.public_id // Store the public_id for future deletion
      });

      if (!updatedUser) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "User not found"));
      }

      res.json(
        createResponse(true, "Profile image uploaded successfully", {
          avatar_url: uploadResult.secure_url,
          public_id: uploadResult.public_id
        })
      );
    } catch (error) {
      console.error("Image upload error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to upload profile image"));
    }
  },

  // Create user by admin
  async createUser(req, res) {
    try {
      const { name, email, password, role } = req.body;

      // Check if user already exists
      const existingUser = await UserModel.findUserByEmail(email);
      if (existingUser) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "User already exists with this email"));
      }

      // Hash password
      const bcrypt = await import("bcryptjs");
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = await UserModel.createUser({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        hashedPassword,
        role: role || "student",
      });

      if (!newUser) {
        throw new Error("User creation failed");
      }

      res
        .status(HTTP_STATUS.CREATED)
        .json(createResponse(true, "User created successfully", newUser));
    } catch (error) {
      console.error("Create user error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to create user"));
    }
  },

  // Update user by admin
  async updateUserByAdmin(req, res) {
    try {
      const { id } = req.params;
      const { name, email, role } = req.body;

      // Check if user exists
      const existingUser = await UserModel.findUserById(id);
      if (!existingUser) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "User not found"));
      }

      // Update user
      const updatedUser = await UserModel.updateUserByAdmin(id, {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: role.toLowerCase()
      });

      if (!updatedUser) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "User not found"));
      }

      res.json(createResponse(true, "User updated successfully", updatedUser));
    } catch (error) {
      console.error("Update user error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to update user"));
    }
  },

  // Get user trend data (Admin only)
  async getUserTrend(req, res) {
    try {
      if (req.user.role !== "admin") {
        return res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(createResponse(false, "Admin access required"));
      }

      const trendData = await UserModel.getUserTrend();
      res.json(
        createResponse(true, "User trend data retrieved successfully", trendData)
      );
    } catch (error) {
      console.error("Get user trend error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to retrieve user trend data"));
    }
  },
};
