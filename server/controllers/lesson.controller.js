import { createResponse} from "../utils/helper.js";
import { HTTP_STATUS } from "../config/constants.js";
import LessonModel from "../models/lesson.model.js";
import { uploadVideo, uploadDocument, deleteVideo, deleteDocument } from "../config/cloudinary.js";

export const LessonController = {
  async create(req, res) {
    try {
      let contentUrl = req.body.contentUrl;
      let cloudinaryPublicId = null;
      
      // Handle file upload if present
      if (req.file) {
        const isVideo = req.file.mimetype.startsWith('video/');
        const isPdf = req.file.mimetype === 'application/pdf';
        
        if (isVideo) {
          // Convert buffer to base64 for Cloudinary upload
          const base64Video = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
          const uploadResult = await uploadVideo(base64Video);
          contentUrl = uploadResult.secure_url;
          cloudinaryPublicId = uploadResult.public_id;
        } else if (isPdf) {
          // Upload PDF to Cloudinary
          const base64Pdf = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
          const uploadResult = await uploadDocument(base64Pdf, {
            folder: 'lms_lessons/pdfs'
          });
          contentUrl = uploadResult.secure_url;
          cloudinaryPublicId = uploadResult.public_id;
        }
      }
      
      const lesson = await LessonModel.create({
        moduleId: req.params.moduleId,
        ...req.body,
        contentUrl,
        cloudinaryPublicId
      });
      
      res.status(HTTP_STATUS.CREATED).json(
        createResponse(true, "Lesson created", lesson)
      );
    } catch (error) {
      console.error('Error creating lesson:', error);
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to create lesson")
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
      const { title, contentType, contentUrl, duration } = req.body;
      const updatedLesson = await LessonModel.update(req.params.lessonId, {
        title,
        content_type: contentType,
        content_url: contentUrl,
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