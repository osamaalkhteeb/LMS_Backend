import express from "express";
import { UserController } from "../controllers/user.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { schema, validateRequest } from "../middleware/validate.js";
import { uploadImage } from "../middleware/upload.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Profile routes ( authenticated users)
router.get("/profile", UserController.getProfile);
router.put("/profile", validateRequest(schema.updateProfile), UserController.updateProfile);
router.put("/change-password", validateRequest(schema.changePassword), UserController.changePassword);

// Image upload route
router.post("/upload-image", uploadImage.single("image"), UserController.uploadProfileImage);

// Admin only routes 
router.get("/", authorize(["admin"]), UserController.getAllUsers);
router.post("/", authorize(["admin"]), validateRequest(schema.createUser), UserController.createUser);
router.put("/:id", authorize(["admin"]), validateRequest(schema.updateUserByAdmin), UserController.updateUserByAdmin);
router.get("/stats", authorize(["admin"]), UserController.getUserStats);
router.get("/trend", authorize(["admin"]), UserController.getUserTrend);
router.get("/role/:role", authorize(["admin", "instructor"]), UserController.getUsersByRole);
router.get("/:id", authorize(["admin", "instructor"]), UserController.getUsersById);
router.patch("/:id/toggle-status", authorize(["admin"]), UserController.toggleUserStatus);
router.delete("/:id", authorize(["admin"]), UserController.deleteUser);

export default router;