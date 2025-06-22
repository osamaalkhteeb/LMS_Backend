import express from "express";
import { LessonController } from "../controllers/lesson.controller.js";
import { authenticate, authorize,isCourseInstructorOrAdmin } from "../middleware/auth.js";
import { validateRequest, schema } from "../middleware/validate.js";
import { uploadLessonContent, handleMulterError } from "../middleware/upload.js";

const router = express.Router();

 router.post(
  "/courses/:courseId/modules/:moduleId/lessons",
  authenticate,
  authorize(["instructor", "admin"]),
  isCourseInstructorOrAdmin,
  uploadLessonContent.single('file'),
  handleMulterError,
  validateRequest(schema.createLesson),
  LessonController.create
);

router.get(
  "/:lessonId",
  authenticate,
  LessonController.getById
);

router.put(
  "/courses/:courseId/lessons/:lessonId",
  authenticate,
  authorize(["instructor", "admin"]),
  isCourseInstructorOrAdmin,
  validateRequest(schema.updateLesson),
  LessonController.update
);

router.delete(
  "/courses/:courseId/lessons/:lessonId",
  authenticate,
  authorize(["instructor", "admin"]),
  isCourseInstructorOrAdmin,
  LessonController.delete
);

export default router;