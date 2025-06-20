import express from 'express';
import { LessonCompletionController } from '../controllers/lessonCompletion.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Mark a lesson as complete
router.post('/', authenticate, authorize(['student']), LessonCompletionController.markComplete);

// Unmark a lesson as complete
router.delete('/', authenticate, authorize(['student']), LessonCompletionController.unmarkComplete);

// Get all completed lessons for the current user
router.get('/', authenticate, LessonCompletionController.getCompletedLessons);

// Get all completed lessons for the current user in a specific course
router.get('/course/:courseId', authenticate, LessonCompletionController.getCompletedLessonsByCourse);

// Get all completed lessons by course (for instructors/analytics)
router.get('/course/:courseId/all', authenticate, authorize(['instructor', 'admin']), LessonCompletionController.getAllCompletedLessonsByCourse);

// Check if a specific lesson is completed by the current user
router.get('/lesson/:lessonId', authenticate, LessonCompletionController.checkLessonCompletion);

export default router;