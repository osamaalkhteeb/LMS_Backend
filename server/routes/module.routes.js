import express from "express";
import { ModuleController } from "../controllers/module.controller.js";
import { authenticate, authorize,isCourseInstructorOrAdmin } from "../middleware/auth.js";
import { validateRequest, schema } from "../middleware/validate.js";

const router = express.Router();

router.post(
  "/courses/:courseId/modules",
  authenticate,
  authorize(["instructor", "admin"]),
  isCourseInstructorOrAdmin,
  validateRequest(schema.createModule),
  ModuleController.create
);

router.get(
  "/courses/:courseId/modules",
  authenticate,
  ModuleController.getByCourse
);

router.get(
  "/modules/:moduleId",
  authenticate,
  ModuleController.getById
);

router.put(
  "/courses/:courseId/modules/:moduleId",
  authenticate,
  authorize(["instructor", "admin"]),
  isCourseInstructorOrAdmin,
  validateRequest(schema.updateModule),
  ModuleController.update
);

// Simplified update route for module order updates
router.put(
  "/modules/:moduleId",
  authenticate,
  authorize(["instructor", "admin"]),
  ModuleController.update
);

router.delete(
  "/courses/:courseId/modules/:moduleId",
  authenticate,
  authorize(["instructor", "admin"]),
  isCourseInstructorOrAdmin,
  ModuleController.delete
);

export default router;