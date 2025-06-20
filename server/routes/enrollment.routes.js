import express from "express";
import { EnrollmentController } from "../controllers/enrollment.controller.js";
import {
  authenticate,
  authorize,
  isCourseInstructorOrAdmin,
} from "../middleware/auth.js";
import { validateRequest, schema } from "../middleware/validate.js";

const router = express.Router();

// Student Endpoints

router.post(
  "/",
  authenticate,
  authorize(["student"]),
  validateRequest(schema.enroll),
  EnrollmentController.enroll
);
router.get(
  "/",
  authenticate,
  authorize(["student"]),
  EnrollmentController.listEnrollments
);

// Admin Endpoints (must come before /:id route)
router.get(
  "/admin",
  authenticate,
  authorize(["admin"]),
  EnrollmentController.getAllEnrollments
);

router.get(
  "/:id",
  authenticate,
  validateRequest(schema.idParam, "params"), // Add validation
  EnrollmentController.getEnrollment
);

// Instructor/Admin Endpoints
router.get(
  "/course/:courseId",
  authenticate,
  authorize(["instructor", "admin"]),
  validateRequest(schema.courseIdParam, "params"),
  isCourseInstructorOrAdmin,
  EnrollmentController.getByCourse
);

router.delete(
  "/:userId/:courseId",
  authenticate,
  authorize(["instructor", "admin"]),
  validateRequest(schema.unenrollParams, "params"),
  isCourseInstructorOrAdmin,
  EnrollmentController.unenroll
);



export default router;
