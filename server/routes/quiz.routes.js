
import express from "express";
import { QuizController } from "../controllers/quiz.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { schema, validateRequest } from "../middleware/validate.js";

const router = express.Router();

// Get all quizzes for authenticated user
router.get("/user", authenticate, QuizController.getUserQuizzes);

// Get quizzes for a lesson
router.get(
  "/lessons/:lessonId",
  authenticate,
  QuizController.getByLesson
);

// Get quiz details
router.get("/:quizId", 
  authenticate, 
  authorize(["student", "instructor", "admin"]), 
  validateRequest(schema.quizId, "params"),
  QuizController.getQuiz
);

// Submit quiz
router.post("/:quizId/submit", 
  authenticate, 
  authorize(["student"]), 
  validateRequest(schema.quizId, "params"),
  QuizController.submitQuiz
);

// View results 
router.get("/:quizId/results", 
  authenticate, 
  authorize(["student","instructor"]), 
  validateRequest(schema.quizId, "params"),
  QuizController.getResults
);

// Get all quiz attempts (Student only)
router.get("/:quizId/attempts",
  authenticate,
  authorize(["student"]),
  validateRequest(schema.quizId, "params"),
  QuizController.getAllAttempts
);

// Create quiz (instructor only)
router.post("/courses/:courseId/lessons/:lessonId/quizzes", 
  authenticate, 
  authorize(["instructor", "admin"]), 
  validateRequest(schema.createQuiz),
  QuizController.createQuiz
);

// Update quiz (instructor only)
router.put("/:quizId", 
  authenticate, 
  authorize(["instructor", "admin"]), 
  validateRequest(schema.quizId, "params"),
  validateRequest(schema.updateQuiz),
  QuizController.updateQuiz
);

// Delete quiz (instructor only)
router.delete("/:quizId", 
  authenticate, 
  authorize(["instructor", "admin"]), 
  validateRequest(schema.quizId, "params"),
  QuizController.deleteQuiz
);

export default router;