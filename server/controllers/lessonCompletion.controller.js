
import LessonCompletionModel from "../models/lessonCompletion.model.js";
import EnrollmentModel from "../models/enrollment.model.js";
import { createResponse } from "../utils/helper.js";
import { HTTP_STATUS } from "../config/constants.js";


export const LessonCompletionController = {
  async markComplete(req, res) {
    try {
      const { lessonId } = req.body;
      const userId = req.user.id;

      // Get enrollment ID (assuming 1 enrollment per course)
      const enrollment = await LessonCompletionModel.getEnrollmentByUserAndLesson(userId, lessonId);

      if (!enrollment) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "Enrollment not found"));
      }

      await LessonCompletionModel.markComplete(userId, lessonId);
      
      const progress = await EnrollmentModel.updateProgress(enrollment.id);
      
      res.json(createResponse(true, "Lesson marked as complete", { progress }));
    } catch (error) {
      console.error("Error marking lesson as complete:", error);
      res
       .status(HTTP_STATUS.SERVER_ERROR)
       .json(createResponse(false, "Failed to mark lesson complete"));
    }
  },

  async getCompletedLessons(req, res) {
    try {
      const userId = req.user.id;
      const completedLessons = await LessonCompletionModel.getCompletedLessons(userId);
      res.json(createResponse(true, "Completed lessons retrieved successfully", { completedLessons }));
    } catch (error) {
      console.error("Error getting completed lessons:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to get completed lessons"));
    }
  },

  async getCompletedLessonsByCourse(req, res) {
    try {
      const { courseId } = req.params;
      const userId = req.user.id;
      
      const completedLessons = await LessonCompletionModel.getCompletedLessonsByCourse(userId, courseId);
      
      res.status(200).json({
        success: true,
        data: completedLessons
      });
    } catch (error) {
      console.error('Error getting completed lessons by course:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get completed lessons by course'
      });
    }
  },

  async getAllCompletedLessonsByCourse(req, res) {
    try {
      const { courseId } = req.params;
      
      const completedLessons = await LessonCompletionModel.getAllCompletedLessonsByCourse(courseId);
      
      res.status(200).json({
        success: true,
        data: completedLessons
      });
    } catch (error) {
      console.error('Error getting all completed lessons by course:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get all completed lessons by course'
      });
    }
  },

  async unmarkComplete(req, res) {
    try {
      const { lessonId } = req.body;
      const userId = req.user.id;

      // Get enrollment ID
      const enrollment = await LessonCompletionModel.getEnrollmentByUserAndLesson(userId, lessonId);

      if (!enrollment) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "Enrollment not found"));
      }

      await LessonCompletionModel.unmarkComplete(userId, lessonId);
      
      const progress = await EnrollmentModel.updateProgress(enrollment.id);
      
      res.json(createResponse(true, "Lesson unmarked as complete", { progress }));
    } catch (error) {
      console.error("Error unmarking lesson as complete:", error);
      res
       .status(HTTP_STATUS.SERVER_ERROR)
       .json(createResponse(false, "Failed to unmark lesson complete"));
    }
  },

  async checkLessonCompletion(req, res) {
    try {
      const userId = req.user.id;
      const { lessonId } = req.params;
      
      const isCompleted = await LessonCompletionModel.isCompleted(userId, lessonId);
      res.json(createResponse(true, "Lesson completion status retrieved", { isCompleted }));
    } catch (error) {
      console.error("Error checking lesson completion:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to check lesson completion"));
    }
  },
};
