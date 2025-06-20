import express from "express";
import AssignmentController from "../controllers/assignment.controller.js";
import { authenticate, authorize, isCourseInstructorOrAdmin} from "../middleware/auth.js";
import { validateRequest, schema } from "../middleware/validate.js";
import { uploadDocument } from "../middleware/upload.js";

const router = express.Router();

// Create assignment (Instructor/Admin only)
router.post(
  "/courses/:courseId/lessons/:lessonId",
  authenticate,
  authorize(["instructor", "admin"]),
  isCourseInstructorOrAdmin,
  validateRequest(schema.createAssignment),
  AssignmentController.create
);

// Get assignments by lesson ID
router.get(
  "/lessons/:lessonId",
  authenticate,
  AssignmentController.getByLessonId
);

// Alternative route for frontend compatibility
router.get(
  "/assignments/lessons/:lessonId",
  authenticate,
  AssignmentController.getByLessonId
);

// Get assignment by ID
router.get(
  "/:id",
  authenticate,
  AssignmentController.getById
);

// Update assignment (Instructor/Admin only)
router.put(
  "/courses/:courseId/assignments/:id",
  authenticate,
  authorize(["instructor", "admin"]),
  isCourseInstructorOrAdmin,
  validateRequest(schema.updateAssignment),
  AssignmentController.update
);

// Delete assignment (Instructor/Admin only)
router.delete(
  "/courses/:courseId/assignments/:id",
  authenticate,
  authorize(["instructor", "admin"]),
  isCourseInstructorOrAdmin,
  AssignmentController.delete
);

// Submit assignment (Student only)
router.post(
  "/:id/submit",
  authenticate,
  authorize(["student"]),
  uploadDocument.single("submissionFile"),
  validateRequest(schema.submitAssignment),
  AssignmentController.submit
);

// Get submissions for an assignment (Instructor/Admin only)
router.get(
  "/courses/:courseId/assignments/:id/submissions",
  authenticate,
  authorize(["instructor", "admin"]),
  isCourseInstructorOrAdmin,
  AssignmentController.getSubmissions
);

// Grade a submission (Instructor/Admin only)
router.put(
  "/courses/:courseId/submissions/:submissionId/grade",
  authenticate,
  authorize(["instructor", "admin"]),
  isCourseInstructorOrAdmin,
  validateRequest(schema.gradeSubmission),
  AssignmentController.gradeSubmission
);

// Get all assignments for instructor
router.get(
  "/instructor/assignments",
  authenticate,
  authorize(["instructor", "admin"]),
  AssignmentController.getInstructorAssignments
);

// Delete submission (Student only - their own submission)
router.delete(
  "/:id/submit",
  authenticate,
  authorize(["student"]),
  AssignmentController.deleteSubmission
);

export default router;