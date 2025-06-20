import  CourseModel  from "../models/course.model.js";
import { HTTP_STATUS } from "../config/constants.js";
import { createResponse } from "../utils/helper.js";
import { uploadImage, deleteImage } from "../config/cloudinary.js";

export const CourseController = {
  // Create course (Instructor only)
  async createCourse(req, res) {
    try {
      const { title, description, category_id, thumbnail_image } = req.body;
      const instructor_id = req.user.id;
      
      let thumbnail_url = null;
      
      // Upload image to cloudinary if provided
      if (thumbnail_image) {
        const uploadResult = await uploadImage(thumbnail_image, {
          folder: 'lms_courses',
          transformation: [
            { width: 800, height: 600, crop: 'fill' },
            { quality: 'auto' }
          ]
        });
        thumbnail_url = uploadResult.secure_url;
      }

      const course = await CourseModel.createCourse({
        title,
        description,
        instructorId: instructor_id,
        categoryId: category_id,
        thumbnailUrl: thumbnail_url,
      });

      res
        .status(HTTP_STATUS.CREATED)
        .json(createResponse(true, "Course created successfully", course));
    } catch (error) {
      console.error("Create course error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to create course"));
    }
  },

  // Update course (Instructor can update own courses, Admin can update any)
  async updateCourse(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = req.user;

      // Check if course exists
      const existingCourse = await CourseModel.getCourseById(id);
      if (!existingCourse) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "Course not found"));
      }

      // Authorization check
      if (
        user.role === "instructor" &&
        existingCourse.instructor_id !== user.id
      ) {
        return res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(createResponse(false, "You can only update your own courses"));
      }

      // Handle image update
      if (updates.thumbnail_image) {
        // Delete old image if exists
        if (existingCourse.thumbnail_url) {
          try {
            // Extract public_id from cloudinary URL
            const urlParts = existingCourse.thumbnail_url.split('/');
            const publicIdWithExtension = urlParts[urlParts.length - 1];
            const publicId = `lms_courses/${publicIdWithExtension.split('.')[0]}`;
            await deleteImage(publicId);
          } catch (deleteError) {
            console.error("Error deleting old image:", deleteError);
            // Continue with update even if old image deletion fails
          }
        }
        
        // Upload new image
        const uploadResult = await uploadImage(updates.thumbnail_image, {
          folder: 'lms_courses',
          transformation: [
            { width: 800, height: 600, crop: 'fill' },
            { quality: 'auto' }
          ]
        });
        updates.thumbnail_url = uploadResult.secure_url;
        delete updates.thumbnail_image; // Remove the base64 data from updates
      }

      // Remove fields that shouldn't be updated by instructors
      if (user.role === "instructor") {
        delete updates.is_approved; // Only admins can approve
        delete updates.instructor_id; // Can't change instructor
      }

      const updatedCourse = await CourseModel.updateCourse(id, updates);

      if (!updatedCourse) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "Course not found"));
      }

      res.json(
        createResponse(true, "Course updated successfully", updatedCourse)
      );
    } catch (error) {
      console.error("Update course error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to update course"));
    }
  },

  // Delete course (Instructor can delete own courses, Admin can delete any)
  async deleteCourse(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const existingCourse = await CourseModel.getCourseById(id);
      if (!existingCourse) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "Course not found"));
      }

      // Authorization check
      if (
        user.role === "instructor" &&
        existingCourse.instructor_id !== user.id
      ) {
        return res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(createResponse(false, "You can only delete your own courses"));
      }

      // Delete image from cloudinary if exists
      if (existingCourse.thumbnail_url) {
        try {
          // Extract public_id from cloudinary URL
          const urlParts = existingCourse.thumbnail_url.split('/');
          const publicIdWithExtension = urlParts[urlParts.length - 1];
          const publicId = `lms_courses/${publicIdWithExtension.split('.')[0]}`;
          await deleteImage(publicId);
        } catch (deleteError) {
          console.error("Error deleting course image:", deleteError);
          // Continue with course deletion even if image deletion fails
        }
      }

      await CourseModel.deleteCourse(id);
      res.json(createResponse(true, "Course deleted successfully"));
    } catch (error) {
      console.error("Delete course error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to delete course"));
    }
  },

  // Get single course details
  async getCourse(req, res) {
    try {
      const { id } = req.params;
      const course = await CourseModel.getCourseById(id);

      if (!course) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "Course not found"));
      }

      res.json(createResponse(true, "Course retrieved successfully", course));
    } catch (error) {
      console.error("Get course error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to retrieve course"));
    }
  },

  // List all courses with flexible filtering
  async listCourses(req, res) {
    try {
      const {
        category_id,
        instructor_id,
        is_published,
        is_approved,
        search,
        limit,
        offset,
        page,
      } = req.query;

      // Convert string boolean values
      const filters = {
        category_id: category_id ? parseInt(category_id) : undefined,
        instructor_id: instructor_id ? parseInt(instructor_id) : undefined,
        is_published:
          is_published === "true"
            ? true
            : is_published === "false"
            ? false
            : undefined,
        is_approved:
          is_approved === "true"
            ? true
            : is_approved === "false"
            ? false
            : undefined,
        search,
        limit: parseInt(limit) || 20,
        offset: page
          ? (parseInt(page) - 1) * (parseInt(limit) || 20)
          : parseInt(offset) || 0,
      };

      const result = await CourseModel.listCourses(filters);
      res.json(createResponse(true, "Courses retrieved successfully", result));
    } catch (error) {
      console.error("List courses error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to list courses"));
    }
  },

  // Get public courses (published and approved only)
  async getPublicCourses(req, res) {
    try {
      const { category_id, search, limit, offset, page } = req.query;

      const filters = {
        category_id: category_id ? parseInt(category_id) : undefined,
        search,
        limit: parseInt(limit) || 20,
        offset: page
          ? (parseInt(page) - 1) * (parseInt(limit) || 20)
          : parseInt(offset) || 0,
      };

      const result = await CourseModel.getPublicCourses(filters);
      res.json(
        createResponse(true, "Public courses retrieved successfully", result)
      );
    } catch (error) {
      console.error("Get public courses error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to retrieve public courses"));
    }
  },

  // Get instructor's courses (for instructor dashboard)
  async getInstructorCourses(req, res) {
    try {
      const { category_id, limit, offset, page } = req.query;
      const instructor_id = req.user.id;

      const filters = {
        category_id: category_id ? parseInt(category_id) : undefined,
        limit: parseInt(limit) || 20,
        offset: page
          ? (parseInt(page) - 1) * (parseInt(limit) || 20)
          : parseInt(offset) || 0,
      };

      const result = await CourseModel.getInstructorCourses(
        instructor_id,
        filters
      );
      res.json(
        createResponse(
          true,
          "Instructor courses retrieved successfully",
          result
        )
      );
    } catch (error) {
      console.error("Get instructor courses error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to retrieve instructor courses"));
    }
  },

  // Get courses pending approval (Admin only)
  async getPendingCourses(req, res) {
    try {
      if (req.user.role !== "admin") {
        return res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(createResponse(false, "Admin access required"));
      }

      const { limit, offset, page } = req.query;

      const filters = {
        limit: parseInt(limit) || 20,
        offset: page
          ? (parseInt(page) - 1) * (parseInt(limit) || 20)
          : parseInt(offset) || 0,
      };

      const result = await CourseModel.getPendingCourses(filters);
      res.json(
        createResponse(true, "Pending courses retrieved successfully", result)
      );
    } catch (error) {
      console.error("Get pending courses error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to retrieve pending courses"));
    }
  },

  // Approve/Reject course (Admin only)
  async approveCourse(req, res) {
    try {
      const { id } = req.params;
      let { is_approved } = req.body;

      if (req.user.role !== "admin") {
        return res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(createResponse(false, "Admin access required"));
      }

      // Convert string boolean to actual boolean (if needed)
    if (typeof is_approved === 'string') {
      if (is_approved.toLowerCase() === 'true') {
        is_approved = true;
      } else if (is_approved.toLowerCase() === 'false') {
        is_approved = false;
      } else {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "is_approved must be 'true' or 'false'"));
      }
    }
    
      if (typeof is_approved !== "boolean") {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "is_approved must be a boolean value"));
      }

      const course = await CourseModel.approveCourse(id, is_approved);

      if (!course) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "Course not found"));
      }

      res.json(
        createResponse(
          true,
          `Course ${is_approved ? "approved" : "rejected"} successfully`,
          course
        )
      );
    } catch (error) {
      console.error("Approve course error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to approve course"));
    }
  },

  // Publish/Unpublish course (Instructor for own courses, Admin for any)
  async publishCourse(req, res) {
    try {
      const { id } = req.params;
      let { is_published } = req.body;
      const user = req.user;

      // Convert string boolean to actual boolean
    if (typeof is_published === 'string') {
      if (is_published.toLowerCase() === 'true') {
        is_published = true; // ✅ Now this works because it's let, not const
      } else if (is_published.toLowerCase() === 'false') {
        is_published = false;
      } else {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "is_published must be 'true' or 'false'"));
      }
    }
      if (typeof is_published !== "boolean") {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "is_published must be a boolean value"));
      }

      // Check if course exists and user has permission
      const existingCourse = await CourseModel.getCourseById(id);
      if (!existingCourse) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "Course not found"));
      }

      if (
        user.role === "instructor" &&
        existingCourse.instructor_id !== user.id
      ) {
        return res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(createResponse(false, "You can only publish your own courses"));
      }

      const course = await CourseModel.publishCourse(id, is_published);
      res.json(
        createResponse(
          true,
          `Course ${is_published ? "published" : "unpublished"} successfully`,
          course
        )
      );
    } catch (error) {
      console.error("Publish course error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to publish course"));
    }
  },

  // Get course statistics (Admin only)
  async getCourseStats(req, res) {
    try {
      if (req.user.role !== "admin") {
        return res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(createResponse(false, "Admin access required"));
      }

      const stats = await CourseModel.getCourseStats();
      res.json(
        createResponse(true, "Course statistics retrieved successfully", stats)
      );
    } catch (error) {
      console.error("Get course stats error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to retrieve course statistics"));
    }
  },

  // Upload course thumbnail
  async uploadThumbnail(req, res) {
    try {
      // Check if file exists in the request
      if (!req.file) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "No thumbnail file provided"));
      }

      const { id } = req.params;
      
      // Get current course to check for existing thumbnail
      const currentCourse = await CourseModel.getCourseById(id);
      if (!currentCourse) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "Course not found"));
      }
      
      // Delete old thumbnail if it exists
      if (currentCourse.image_public_id) {
        try {
          await deleteImage(currentCourse.image_public_id);
        } catch (deleteError) {
          console.error("Error deleting old thumbnail:", deleteError);
          // Continue with upload even if delete fails
        }
      }

      // Convert buffer to base64 for Cloudinary upload
      const fileBuffer = req.file.buffer;
      const fileType = req.file.mimetype;
      const base64String = `data:${fileType};base64,${fileBuffer.toString('base64')}`;

      // Upload thumbnail to Cloudinary
      const uploadResult = await uploadImage(base64String, {
        folder: 'course_thumbnails',
        public_id: `course_${id}_${Date.now()}`,
        overwrite: true,
        resource_type: 'image'
      });

      // Update course's thumbnail_url and image_public_id in the database
      const updatedCourse = await CourseModel.updateCourse(id, {
        thumbnail_url: uploadResult.secure_url,
        image_public_id: uploadResult.public_id
      });

      if (!updatedCourse) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "Course not found"));
      }

      res.json(
        createResponse(true, "Course thumbnail uploaded successfully", {
          thumbnail_url: uploadResult.secure_url,
          public_id: uploadResult.public_id
        })
      );
    } catch (error) {
      console.error("Thumbnail upload error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to upload course thumbnail"));
    }
  },

  // Get courses grouped by category (Admin only)
  async getCoursesByCategory(req, res) {
    try {
      if (req.user.role !== "admin") {
        return res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(createResponse(false, "Admin access required"));
      }

      const coursesByCategory = await CourseModel.getCoursesByCategory();
      res.json(
        createResponse(true, "Courses by category retrieved successfully", coursesByCategory)
      );
    } catch (error) {
      console.error("Get courses by category error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to retrieve courses by category"));
    }
  },

  // Get top performing courses (Admin only)
  async getTopPerformingCourses(req, res) {
    try {
      if (req.user.role !== "admin") {
        return res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(createResponse(false, "Admin access required"));
      }

      const limit = parseInt(req.query.limit) || 10;
      const topCourses = await CourseModel.getTopPerformingCourses(limit);
      res.json(
        createResponse(true, "Top performing courses retrieved successfully", topCourses)
      );
    } catch (error) {
      console.error("Get top performing courses error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to retrieve top performing courses"));
    }
  },

  // Get course trend data (Admin only)
  async getCourseTrend(req, res) {
    try {
      if (req.user.role !== "admin") {
        return res
          .status(HTTP_STATUS.FORBIDDEN)
          .json(createResponse(false, "Admin access required"));
      }

      const trendData = await CourseModel.getCourseTrend();
      res.json(
        createResponse(true, "Course trend data retrieved successfully", trendData)
      );
    } catch (error) {
      console.error("Get course trend error:", error);
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to retrieve course trend data"));
    }
  },
};
