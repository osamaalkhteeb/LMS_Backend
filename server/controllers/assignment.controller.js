import AssignmentModel from "../models/assignment.model.js";
import LessonModel from "../models/lesson.model.js";
import LessonCompletionModel from "../models/lessonCompletion.model.js";
import EnrollmentModel from "../models/enrollment.model.js";
import { HTTP_STATUS } from "../config/constants.js";
import { createResponse } from "../utils/helper.js";
import { uploadDocument, deleteDocument } from "../config/cloudinary.js";

const AssignmentController = {
  // Create a new assignment
  async create(req, res) {
    try {
      const { lessonId } = req.params;
      const { title, description, deadline } = req.body;
      
      console.log('=== ASSIGNMENT CONTROLLER CREATE DEBUG ===');
      console.log('Lesson ID:', lessonId);
      console.log('Request body:', req.body);
      console.log('Extracted data:', { title, description, deadline });
      
      // Verify the lesson exists
      const lesson = await LessonModel.getById(lessonId);
      console.log('Found lesson:', lesson);
      if (!lesson) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "Lesson not found")
        );
      }
      
      const assignmentData = {
      lessonId,
      title,
      description,
      deadline
    };
      console.log('Creating assignment with data:', assignmentData);
      
      const assignment = await AssignmentModel.create(assignmentData);
      console.log('Created assignment:', assignment);
      
      res.status(HTTP_STATUS.CREATED).json(
        createResponse(true, "Assignment created successfully", assignment)
      );
    } catch (error) {
      console.error("Create assignment error:", error);
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to create assignment")
      );
    }
  },
  
  // Get assignment by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id; // Get current user ID from auth middleware
      
      // Get assignment with submission status for current user
      const assignment = await AssignmentModel.getByIdWithSubmission(id, userId);
      
      if (!assignment) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "Assignment not found")
        );
      }
      
      res.json(createResponse(true, "Assignment retrieved successfully", assignment));
    } catch (error) {
      console.error("Get assignment error:", error);
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to retrieve assignment")
      );
    }
  },
  
  // Get assignments by lesson ID
  async getByLessonId(req, res) {
    try {
      const { lessonId } = req.params;
      const userId = req.user?.id; // Get current user ID from auth middleware
      const assignments = await AssignmentModel.getByLessonId(lessonId, userId);
      
      res.json(createResponse(true, "Assignments retrieved successfully", assignments));
    } catch (error) {
      console.error("Get assignments by lesson error:", error);
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to retrieve assignments")
      );
    }
  },
  
  // Update assignment
  async update(req, res) {
    try {
      const { id } = req.params;
      const { title, description, deadline } = req.body;
      
      const assignment = await AssignmentModel.update(id, {
        title,
        description,
        deadline
      });
      
      if (!assignment) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "Assignment not found")
        );
      }
      
      res.json(createResponse(true, "Assignment updated successfully", assignment));
    } catch (error) {
      console.error("Update assignment error:", error);
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to update assignment")
      );
    }
  },
  
  // Delete assignment
  async delete(req, res) {
    try {
      const { id } = req.params;
      
      const deleted = await AssignmentModel.delete(id);
      
      if (!deleted) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "Assignment not found")
        );
      }
      
      res.json(createResponse(true, "Assignment deleted successfully"));
    } catch (error) {
      console.error("Delete assignment error:", error);
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to delete assignment")
      );
    }
  },
  
  // Submit assignment
  async submit(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      let submissionUrl = null;
      
      // Check if assignment exists
      const assignment = await AssignmentModel.getById(id);
      if (!assignment) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "Assignment not found")
        );
      }
      
      // Check if deadline has passed
      if (new Date(assignment.deadline) < new Date()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, "Assignment deadline has passed")
        );
      }
      
      // Validate that at least one submission type is provided
      const hasFile = !!req.file;
      const hasUrl = req.body.submissionUrl && typeof req.body.submissionUrl === 'string' && req.body.submissionUrl.trim() !== '';
      const hasContent = req.body.content && typeof req.body.content === 'string' && req.body.content.trim() !== '';
      

      
      if (!hasFile && !hasUrl && !hasContent) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, "At least one of file upload, submission URL, or content must be provided")
        );
      }
      
      // Handle file upload if present
      if (req.file) {
        try {
    
          // Convert buffer to base64
          const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
          
          // Upload to Cloudinary
          const fileExtension = req.file.originalname.split('.').pop();
          const uploadResult = await uploadDocument(base64File, req.file.originalname, {
            public_id: `assignment_${id}_user_${userId}_${Date.now()}`,
            use_filename: true,
            unique_filename: false,
            format: fileExtension
          });
          
          submissionUrl = uploadResult.secure_url;

        } catch (uploadError) {
          console.error('❌ Cloudinary upload error:', uploadError);
          
          // Handle specific Cloudinary errors and pass them to client
          if (uploadError.message?.includes('File size too large')) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(
              createResponse(false, 'File size exceeds the 50MB limit', null, {
                code: 'FILE_TOO_LARGE',
                details: 'Please compress your file or choose a smaller file',
                cloudinaryError: uploadError.message
              })
            );
          }
          
          // Pass Cloudinary error details to client
          if (uploadError.http_code >= 400) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(
              createResponse(false, 'Cloudinary upload failed', null, {
                code: 'CLOUDINARY_ERROR',
                details: uploadError.message || 'Upload service error',
                cloudinaryError: uploadError.message,
                httpCode: uploadError.http_code
              })
            );
          }
          
          // For any other Cloudinary errors, pass the full error message
          return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
            createResponse(false, 'Upload failed', null, {
              code: 'UPLOAD_ERROR',
              details: uploadError.message || 'Unknown upload error',
              cloudinaryError: uploadError.message
            })
          );
        }
      } else if (hasUrl) {
        // Use provided URL
        submissionUrl = req.body.submissionUrl;
      } else {
        // Use content for text submissions (including empty content)
        submissionUrl = req.body.content;
      }
      
      const submission = await AssignmentModel.submitAssignment({
        assignmentId: id,
        userId,
        submissionUrl
      });
      
      // Mark the associated lesson as complete when assignment is submitted
      const assignmentData = await AssignmentModel.getById(id);
      if (assignmentData && assignmentData.lesson_id) {
        try {
          await LessonCompletionModel.markComplete(userId, assignmentData.lesson_id);
        } catch (error) {
          // Ignore if already completed
          if (!error.message.includes('already completed')) {
            console.error('Error marking assignment lesson as complete:', error);
          }
        }
      }
      
      // Update course progress
      const enrollment = await EnrollmentModel.getByUserAndCourse(userId, assignmentData.course_id);
      if (enrollment) {
        await EnrollmentModel.updateProgress(enrollment.id);
      }
      
      res.status(HTTP_STATUS.CREATED).json(
        createResponse(true, "Assignment submitted successfully", submission)
      );
    } catch (error) {
      console.error("Submit assignment error:", error);
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to submit assignment")
      );
    }
  },
  
  // Get all assignments for an instructor
  async getInstructorAssignments(req, res) {
    try {
      const instructorId = req.user.id;
      const assignments = await AssignmentModel.getInstructorAssignments(instructorId);
      res.json(createResponse(true, "Instructor assignments retrieved successfully", assignments));
    } catch (error) {
      console.error("Error getting instructor assignments:", error);
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to get assignments")
      );
    }
  },

  // Get submissions for an assignment
  async getSubmissions(req, res) {
    try {
      const { id } = req.params;
      const submissions = await AssignmentModel.getSubmissions(id);
      
      res.json(createResponse(true, "Submissions retrieved successfully", submissions));
    } catch (error) {
      console.error("Get submissions error:", error);
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to retrieve submissions")
      );
    }
  },
  
  // Grade a submission
  async gradeSubmission(req, res) {
    try {
      const { submissionId } = req.params;
      const { grade, feedback } = req.body;
      
      const gradedSubmission = await AssignmentModel.gradeSubmission(submissionId, {
        grade,
        feedback,
        gradedBy: req.user.id
      });
      
      if (!gradedSubmission) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "Submission not found")
        );
      }
      
      res.json(createResponse(true, "Submission graded successfully", gradedSubmission));
    } catch (error) {
      console.error("Grade submission error:", error);
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to grade submission")
      );
    }
  },

  // Delete submission (Student only - their own submission)
  async deleteSubmission(req, res) {
    try {
      const { id } = req.params; // assignment ID
      const userId = req.user.id;
      
      // Check if assignment exists
      const assignment = await AssignmentModel.getById(id);
      if (!assignment) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "Assignment not found")
        );
      }
      
      // Check if deadline has passed
      if (new Date(assignment.deadline) < new Date()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, "Cannot delete submission after deadline")
        );
      }
      
      // First, get the submission to retrieve the file URL before deletion
      const submissions = await AssignmentModel.getSubmissions(id);
      const userSubmission = submissions.find(sub => sub.user_id === userId);
      
      if (!userSubmission) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "No submission found to delete")
        );
      }
      
      // If there's a file uploaded to Cloudinary, delete it
      if (userSubmission.submission_url && userSubmission.submission_url.includes('cloudinary.com')) {
        try {

          
          // Extract public ID from Cloudinary URL
          // URL format: https://res.cloudinary.com/cloud_name/raw/upload/v1234567890/folder/public_id.ext
          const url = userSubmission.submission_url;
          const uploadIndex = url.indexOf('/upload/');
          if (uploadIndex !== -1) {
            // Get everything after '/upload/v{version}/'
            const afterUpload = url.substring(uploadIndex + 8); // 8 = length of '/upload/'
            const versionMatch = afterUpload.match(/^v\d+\/(.+)$/);
            if (versionMatch) {
              // Remove file extension from the public ID
              const publicIdWithExt = versionMatch[1];
              const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
              
              const deleteResult = await deleteDocument(publicId);
            }
          }
        } catch (cloudinaryError) {
          console.error('Error deleting file from Cloudinary:', cloudinaryError);
          // Continue with database deletion even if Cloudinary deletion fails
        }
      }
      
      // Delete the submission from database
      const deleted = await AssignmentModel.deleteSubmission(id, userId);
      
      if (!deleted) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "No submission found to delete")
        );
      }
      
      // Remove lesson completion when assignment submission is deleted
      if (assignment.lesson_id) {
        try {
          await LessonCompletionModel.unmarkComplete(userId, assignment.lesson_id);
        } catch (error) {
          console.error('Error unmarking assignment lesson completion:', error);
        }
      }
      
      // Update course progress after deleting submission
      const enrollment = await EnrollmentModel.getByUserAndCourse(userId, assignment.course_id);
      let progress = null;
      
      if (enrollment) {
        progress = await EnrollmentModel.updateProgress(enrollment.id);
      }
      
      res.json(createResponse(true, "Submission deleted successfully", { progress }));
    } catch (error) {
      console.error("Delete submission error:", error);
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to delete submission")
      );
    }
  }
};

export default AssignmentController;
