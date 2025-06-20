import EnrollmentModel from "../models/enrollment.model.js";
import CourseModel from "../models/course.model.js";
import { HTTP_STATUS } from "../config/constants.js";
import { createResponse } from "../utils/helper.js";

export const EnrollmentController = {
  // Enroll in a course
  async enroll(req, res) {
    try {

      
      // Validate request body exists and has course_id
      if (!req.body || !req.body.course_id) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, "Course ID is required")
        );
      }

      const  {course_id}  = req.body;
      const  user_id  = req.user.id;
      


      // Validate course exists and is published
      const course = await CourseModel.getCourseById(course_id);
      if (!course || !course.is_published) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "Course not available"));
      }

      const enrollment = await EnrollmentModel.enroll(user_id, course_id);
      res
        .status(HTTP_STATUS.CREATED)
        .json(createResponse(true, "Enrollment successful", enrollment));
    } catch (error) {
      const status = error.message.includes("Already enrolled")
        ? HTTP_STATUS.CONFLICT
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      res
        .status(status)
        .json(createResponse(false, error.message || "Enrollment failed"));
    }
  },

  // List user's enrollments
  async listEnrollments(req, res) {
    try {
      const enrollment = await EnrollmentModel.getByUser(req.user.id);
      res
        .status(HTTP_STATUS.OK)
        .json(createResponse(true, "Enrollments retrieved", enrollment));
    } catch (error) {
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(createResponse(false, "Failed getting enrollments"));
    }
  },

  // Get enrollment details
  async getEnrollment(req, res) {
    try {
      const enrollment = await EnrollmentModel.getById(req.params.id);
      if (!enrollment) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "Enrollment not found"));
      }

      // Authorization check 
      if (req.user.role === "student" && enrollment.user_id !== req.user.id) {
        return res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(createResponse(false, "Access denied"));
      }
      res.json(createResponse(true, "Enrollment details", enrollment));
    } catch (error) {
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to get enrollment"));
    }
  },
  // Get enrollments for a course (Instructor/Admin only)
async getByCourse(req, res) {
    try {
      const { courseId } = req.params;
      
      // Authorization: Only course instructor or admin can view enrollments
      const course = await CourseModel.getCourseById(courseId);
      if (
        req.user.role !== 'admin' && 
        course.instructor_id !== req.user.id
      ) {
        return res.status(HTTP_STATUS.FORBIDDEN).json(
          createResponse(false, "Not authorized")
        );
      }
  
      const enrollments = await EnrollmentModel.getByCourse(courseId);
      res.json(createResponse(true, "Enrollments retrieved", enrollments));
    } catch (error) {
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to fetch enrollments")
      );
    }
  },
  
  // Unenroll student (Admin/Instructor only)
  async unenroll(req, res) {
    try {
      const { userId, courseId } = req.params;
  
      // Authorization check
      const course = await CourseModel.getCourseById(courseId);
      if (
        req.user.role !== 'admin' && 
        course.instructor_id !== req.user.id
      ) {
        return res.status(HTTP_STATUS.FORBIDDEN).json(
          createResponse(false, "Not authorized")
        );
      }
  
      await EnrollmentModel.unenroll(userId, courseId);
      res.json(createResponse(true, "User unenrolled successfully"));
    } catch (error) {
      // Handle specific error messages
      if (error.message === "Enrollment not found") {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "Enrollment not found")
        );
      }
      
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to unenroll user")
      );
    }
  },
  
  // Get all enrollments (Admin only)
  async getAllEnrollments(req, res) {
    try {
      // Verify admin role (additional security check)
      if (req.user.role !== 'admin') {
        return res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(createResponse(false, "Access denied"));
      }

      // Get all enrollments with user and course details
      const enrollments = await EnrollmentModel.getAllEnrollments();

      res
        .status(HTTP_STATUS.OK)
        .json(createResponse(true, "All enrollments retrieved", enrollments));
    } catch (error) {
      console.error("Error getting all enrollments:", error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(createResponse(false, "Failed getting enrollments"));
    }
  },
};
