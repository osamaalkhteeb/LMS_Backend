import { query } from "../config/db.js";
import { deleteVideo, deleteDocument } from "../config/cloudinary.js";

const CourseModel = {
  // Create a new course (Instructor only)
  async createCourse({
    title,
    description,
    instructorId,
    categoryId,
    thumbnailUrl,
  }) {
    try {
      const { rows } = await query(
        "INSERT INTO courses (title, description, instructor_id, category_id, thumbnail_url) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [title, description, instructorId, categoryId, thumbnailUrl]
      );
      return rows[0];
    } catch (error) {
      console.error("Error creating course:", error);
      throw error;
    }
  },

  // Update Course (Instructor/Admin)
  async updateCourse(id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.keys(updates).forEach((key) => {
        if (updates[key] !== undefined) {
          fields.push(`${key} = $${paramIndex++}`);
          values.push(updates[key]);
        }
      });

      if (fields.length === 0) {
        throw new Error("No fields to update");
      }

      // Add updated_at timestamp
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const updateQuery = `
        UPDATE courses 
        SET ${fields.join(", ")} 
        WHERE id = $${paramIndex} 
        RETURNING *
      `;

      const { rows } = await query(updateQuery, values);
      return rows[0];
    } catch (error) {
      console.error("Error updating course:", error);
      throw error;
    }
  },

  // Delete course (Instructor/Admin)
  async deleteCourse(id) {
    try {
      // Start transaction
      await query("BEGIN");
      
      // Delete lesson completions first
      await query(
        "DELETE FROM lesson_completions WHERE lesson_id IN (SELECT l.id FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = $1)",
        [id]
      );
      
      // Delete assignments and submissions
      await query(
        "DELETE FROM submissions WHERE assignment_id IN (SELECT a.id FROM assignments a JOIN lessons l ON a.lesson_id = l.id JOIN modules m ON l.module_id = m.id WHERE m.course_id = $1)",
        [id]
      );
      
      await query(
        "DELETE FROM assignments WHERE lesson_id IN (SELECT l.id FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = $1)",
        [id]
      );
      
      // Get lessons with Cloudinary public IDs before deleting
      const { rows: lessonsToDelete } = await query(
        "SELECT cloudinary_public_id, content_type FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id = $1) AND cloudinary_public_id IS NOT NULL",
        [id]
      );
      
      // Delete lessons from Cloudinary
      for (const lesson of lessonsToDelete) {
        try {
          if (lesson.content_type === 'video') {
            await deleteVideo(lesson.cloudinary_public_id);
          } else {
            await deleteDocument(lesson.cloudinary_public_id);
          }
        } catch (cloudinaryError) {
          console.error('Error deleting lesson file from Cloudinary:', cloudinaryError);
          // Continue with deletion even if Cloudinary cleanup fails
        }
      }
      
      // Delete lessons from database
      await query(
        "DELETE FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id = $1)",
        [id]
      );
      
      // Delete modules
      await query(
        "DELETE FROM modules WHERE course_id = $1",
        [id]
      );
      
      // Delete enrollments
      await query(
        "DELETE FROM enrollments WHERE course_id = $1",
        [id]
      );
      
      // Finally delete the course
      const { rows } = await query(
        "DELETE FROM courses WHERE id = $1 RETURNING *",
        [id]
      );
      
      // Commit transaction
      await query("COMMIT");
      
      return rows[0];
    } catch (error) {
      // Rollback transaction on error
      await query("ROLLBACK");
      console.error("Error deleting course:", error);
      throw error;
    }
  },

  // Get course by ID (with instructor and category details)
  async getCourseById(id) {
    try {
      const { rows } = await query(
        `SELECT c.*, 
                u.name as instructor_name, 
                u.avatar_url as instructor_avatar,
                cat.name as category_name,
                COUNT(e.id) as enrolled_count
         FROM courses c
         LEFT JOIN users u ON c.instructor_id = u.id
         LEFT JOIN categories cat ON c.category_id = cat.id
         LEFT JOIN enrollments e ON c.id = e.course_id
         WHERE c.id = $1
         GROUP BY c.id, u.name, u.avatar_url, cat.name`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error("Error fetching course:", error);
      throw error;
    }
  },

  // List courses with flexible filtering
  async listCourses({
    categoryId,
    instructorId,
    isPublished,
    isApproved,
    search,
    limit = 20,
    offset = 0,
  }) {
    try {
      let baseQuery = `
        SELECT c.*, 
              u.name as instructor_name, 
              u.avatar_url as instructor_avatar,
              cat.name as category_name,
              COUNT(e.id) as enrolled_count
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN categories cat ON c.category_id = cat.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      // Filter by category
      if (categoryId) {
        baseQuery += ` AND c.category_id = $${paramIndex++}`;
        params.push(categoryId);
      }

      // Filter by instructor
      if (instructorId) {
        baseQuery += ` AND c.instructor_id = $${paramIndex++}`;
        params.push(instructorId);
      }

      // Filter by published status
      if (isPublished !== undefined) {
        baseQuery += ` AND c.is_published = $${paramIndex++}`;
        params.push(isPublished);
      }

      // Filter by approved status
      if (isApproved !== undefined) {
        baseQuery += ` AND c.is_approved = $${paramIndex++}`;
        params.push(isApproved);
      }

      // Search by title or description
      if (search) {
        const searchPattern = `%${search}%`;
        baseQuery += ` AND (c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
        params.push(searchPattern);
        paramIndex++;
      }

      // Add GROUP BY clause for aggregation
      baseQuery += ` GROUP BY c.id, u.name, u.avatar_url, cat.name`;
      
      // Add ordering and pagination
      baseQuery += ` ORDER BY c.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      params.push(limit, offset);

      const { rows } = await query(baseQuery, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM courses c
        WHERE 1=1
      `;

      const countParams = [];
      let countParamIndex = 1;

      // Apply same filters for count
      if (categoryId) {
        countQuery += ` AND c.category_id = $${countParamIndex++}`;
        countParams.push(categoryId);
      }
      if (instructorId) {
        countQuery += ` AND c.instructor_id = $${countParamIndex++}`;
        countParams.push(instructorId);
      }
      if (isPublished !== undefined) {
        countQuery += ` AND c.is_published = $${countParamIndex++}`;
        countParams.push(isPublished);
      }
      if (isApproved !== undefined) {
        countQuery += ` AND c.is_approved = $${countParamIndex++}`;
        countParams.push(isApproved);
      }
      if (search) {
        countQuery += ` AND (c.title ILIKE $${countParamIndex++} OR c.description ILIKE $${countParamIndex++})`;
        countParams.push(`%${search}%`, `%${search}%`);
        countParamIndex++;
      }

      const { rows: countRows } = await query(countQuery, countParams);
      const total = parseInt(countRows[0].total);

      return {
        courses: rows,
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit),
          currentPage: Math.floor(offset / limit) + 1,
        },
      };
    } catch (error) {
      console.error("Error fetching courses:", error);
      throw error;
    }
  },

  // Get public courses (published and approved only)
  async getPublicCourses({ categoryId, search, limit = 20, offset = 0 }) {
    return this.listCourses({
      categoryId,
      search,
      isPublished: true,
      isApproved: true,
      limit,
      offset,
    });
  },

  // Get instructor's courses (all their courses regardless of status)
  async getInstructorCourses(
    instructorId,
    { categoryId, limit = 20, offset = 0 }
  ) {
    return this.listCourses({
      instructorId,
      categoryId,
      limit,
      offset,
    });
  },

  // Get pending courses (published but not approved - for admin)
  async getPendingCourses({ limit = 20, offset = 0 }) {
    return this.listCourses({
      isApproved: false,
      limit,
      offset,
    });
  },

  // Approve/Reject course (Admin only)
  async approveCourse(id, isApproved) {
    try {
      const { rows } = await query(
        `UPDATE courses 
         SET is_approved = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING *`,
        [isApproved, id]
      );
      return rows[0];
    } catch (error) {
      console.error("Error approving course:", error);
      throw error;
    }
  },

  // Publish/Unpublish course (Instructor/Admin)
  async publishCourse(id, isPublished) {
    try {
      const { rows } = await query(
        `UPDATE courses 
         SET is_published = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING *`,
        [isPublished, id]
      );
      return rows[0];
    } catch (error) {
      console.error("Error publishing course:", error);
      throw error;
    }
  },

  // Get course statistics
  async getCourseStats() {
    try {
      const { rows } = await query(`
        SELECT 
          COUNT(*) as total_courses,
          COUNT(CASE WHEN is_published = true AND is_approved = true THEN 1 END) as published_courses,
          COUNT(CASE WHEN is_approved = false THEN 1 END) as pending_courses,
          COUNT(CASE WHEN is_published = false  THEN 1 END) as draft_courses
        FROM courses
      `);
      return rows[0];
    } catch (error) {
      console.error("Error fetching course stats:", error);
      throw error;
    }
  },
  // Get courses by category distribution
  async getCoursesByCategory() {
    try {
      const { rows } = await query(`
        SELECT 
          COALESCE(cat.name, 'Uncategorized') as category_name,
          COUNT(c.id) as course_count
        FROM courses c
        LEFT JOIN categories cat ON c.category_id = cat.id
        WHERE c.is_published = true AND c.is_approved = true
        GROUP BY cat.id, cat.name
        ORDER BY course_count DESC
      `);
      
      // Return the actual category data array
      return rows;
    } catch (error) {
      console.error("Error fetching courses by category:", error);
      throw error;
    }
  },

  // Get top performing courses by enrollment count
  async getTopPerformingCourses(limit = 10) {
    try {
      const { rows } = await query(`
        SELECT 
          c.id,
          c.title,
          COALESCE(cat.name, 'Uncategorized') as category_name,
          COUNT(e.id) as enrollment_count,
          COUNT(CASE WHEN e.completed_at IS NOT NULL THEN 1 END) as completion_count,
          CASE 
            WHEN COUNT(e.id) > 0 THEN 
              ROUND((COUNT(CASE WHEN e.completed_at IS NOT NULL THEN 1 END)::DECIMAL / COUNT(e.id)) * 100, 2)
            ELSE 0
          END as completion_rate
        FROM courses c
        LEFT JOIN categories cat ON c.category_id = cat.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE c.is_published = true AND c.is_approved = true
        GROUP BY c.id, c.title, cat.name
        ORDER BY enrollment_count DESC, completion_rate DESC
        LIMIT $1
      `, [limit]);
      
      return rows.map(row => ({
        id: row.id,
        title: row.title,
        categoryName: row.category_name,
        enrollmentCount: parseInt(row.enrollment_count, 10),
        completionCount: parseInt(row.completion_count, 10),
        completionRate: parseFloat(row.completion_rate)
      }));
    } catch (error) {
      console.error("Error fetching top performing courses:", error);
      throw error;
    }
  },

  // Get course trend data for the last 6 months
  async getCourseTrend() {
    try {
      const { rows } = await query(`
        WITH months AS (
          SELECT 
            TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + INTERVAL '1 month' * generate_series(0, 5)), 'Mon') as month_name,
            DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + INTERVAL '1 month' * generate_series(0, 5)) as month_date
        ),
        course_counts AS (
          SELECT 
            DATE_TRUNC('month', created_at) as month_date,
            COUNT(*) as courses_created
          FROM courses 
          WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
          GROUP BY DATE_TRUNC('month', created_at)
        ),
        cumulative_counts AS (
          SELECT 
            m.month_name,
            m.month_date,
            COALESCE(cc.courses_created, 0) as courses_created,
            (
              SELECT COUNT(*) 
              FROM courses 
              WHERE created_at <= m.month_date + INTERVAL '1 month' - INTERVAL '1 second'
            ) as total_courses
          FROM months m
          LEFT JOIN course_counts cc ON m.month_date = cc.month_date
        )
        SELECT 
          array_agg(month_name ORDER BY month_date) as labels,
          array_agg(total_courses ORDER BY month_date) as data
        FROM cumulative_counts
      `);
      
      return {
        labels: rows[0]?.labels || [],
        data: rows[0]?.data || []
      };
    } catch (error) {
      throw error;
    }
  },
};

export default CourseModel;
