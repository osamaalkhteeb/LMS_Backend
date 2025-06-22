import { createResponse } from "../utils/helper.js";
import { HTTP_STATUS, SUPPORTED_FILE_TYPES } from "../config/constants.js";
import LessonModel from "../models/lesson.model.js";
import { uploadVideo, uploadDocument, deleteVideo, deleteDocument } from "../config/cloudinary.js";


export const LessonController = {
  async create(req, res) {
    
    try {
      const { courseId, moduleId } = req.params;

      const { title, description, content, contentType, orderNum, duration } = req.body;
      
      // Map frontend field names to backend field names
      const type = contentType;
      const order_index = orderNum ? parseInt(orderNum) : null;

      const file = req.file;
      let fileUrl = null;
      let publicId = null;

      // Handle file upload if present
      if (file) {
        // Check file size limit using constants
        const fileTypeConfig = type === 'video' ? SUPPORTED_FILE_TYPES.VIDEO : SUPPORTED_FILE_TYPES.DOCUMENT;
        
        if (file.size > fileTypeConfig.maxSize) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json(
            createResponse(false, `File size exceeds the limit`, null, {
              code: 'FILE_TOO_LARGE',
              details: `Please compress your file or choose a smaller file. ${fileTypeConfig.description}`,
              fileSize: file.size,
              maxSize: fileTypeConfig.maxSize,
              supportedTypes: fileTypeConfig.description
            })
          );
        }
        
        try {
          let uploadResult;
          
          if (type === 'video') {
            uploadResult = await uploadVideo(file.buffer, file.originalname, {
              quality: 'auto:low', // Lower quality for free tier
              format: 'mp4',
              chunk_size: 6000000,
              timeout: 120000
              // Removed eager transformations for free tier compatibility
            });
          } else {
            uploadResult = await uploadDocument(file.buffer, file.originalname, {
              chunk_size: 6000000,
              timeout: 60000
            });
          }
          
          fileUrl = uploadResult.secure_url;
          publicId = uploadResult.public_id;
          
        } catch (uploadError) {
          
          // Handle specific Cloudinary errors and pass them to client
          if (uploadError.message?.includes('Requested resource too large') || uploadError.message?.includes('File size too large')) {
            const fileTypeConfig = type === 'video' ? SUPPORTED_FILE_TYPES.VIDEO : SUPPORTED_FILE_TYPES.DOCUMENT;
            return res.status(HTTP_STATUS.BAD_REQUEST).json(
                createResponse(false, `File size exceeds the limit`, null, {
                code: 'FILE_TOO_LARGE',
                details: `Please compress your file or choose a smaller file. ${fileTypeConfig.description}`,
                cloudinaryError: uploadError.message,
                supportedTypes: fileTypeConfig.description
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
      }

      // Create lesson in database - map to model's expected parameters
      const lessonData = {
        moduleId: parseInt(moduleId),
        title,
        contentType: type,
        contentUrl: fileUrl || content, // Use fileUrl for uploaded files, or content for text/URL content
        duration: duration ? parseInt(duration) : null,
        orderNum: order_index,
        cloudinaryPublicId: publicId
      };
      
      const lesson = await LessonModel.create(lessonData);

      res.status(HTTP_STATUS.CREATED).json(
        createResponse(true, 'Lesson created successfully', lesson)
      );
    } catch (error) {
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, 'Failed to create lesson', null, {
          code: 'CREATION_ERROR',
          details: error.message || 'An unexpected error occurred'
        })
      );
    }
  },

  async getById(req, res) {
    try {
      const lesson = await LessonModel.getById(req.params.lessonId);
      if (!lesson) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "Lesson not found")
        );
      }
      res.json(createResponse(true, "Lesson retrieved", lesson));
    } catch (error) {
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to fetch lesson")
      );
    }
  },
  
  async update(req, res) {
    try {
      const { title, contentType, content, duration } = req.body;
      const updatedLesson = await LessonModel.update(req.params.lessonId, {
        title,
        content_type: contentType,
        content_url: content,
        duration
      });
      
      if (!updatedLesson) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "Lesson not found")
        );
      }
      
      res.json(createResponse(true, "Lesson updated", updatedLesson));
    } catch (error) {
      console.error('❌ Error updating lesson:', error);
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to update lesson")
      );
    }
  },
  
  async delete(req, res) {
    try {
      // Get lesson details before deletion to access Cloudinary info
      const lesson = await LessonModel.getById(req.params.lessonId);
      
      if (!lesson) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "Lesson not found")
        );
      }
      
      // Delete from Cloudinary if the content was uploaded there
      if (lesson.cloudinary_public_id) {
        try {
          if (lesson.content_type === 'video') {
            await deleteVideo(lesson.cloudinary_public_id);
          } else {
            await deleteDocument(lesson.cloudinary_public_id);
          }
        } catch (cloudinaryError) {
          console.error('Error deleting from Cloudinary:', cloudinaryError);
          // Continue with lesson deletion even if Cloudinary deletion fails
        }
      }
      
      const deleted = await LessonModel.delete(req.params.lessonId);
      
      if (!deleted) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "Lesson not found")
        );
      }
      
      res.json(createResponse(true, "Lesson deleted successfully"));
    } catch (error) {
      console.error('Error deleting lesson:', error);
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to delete lesson")
      );
    }
  }
};