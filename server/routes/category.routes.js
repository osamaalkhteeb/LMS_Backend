import express from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { authenticate,authorize } from "../middleware/auth.js";

const router = express.Router();

// Public routes 
router.get("/", CategoryController.listCategories);
router.get("/:id", CategoryController.getCategoryById);

// Admin-only routes
router.post("/", authenticate, authorize(["admin"]), CategoryController.createCategory);
router.put("/:id", authenticate, authorize(["admin"]), CategoryController.updateCategory);
router.delete("/:id", authenticate, authorize(["admin"]), CategoryController.deleteCategory);

export default router;