import { query } from "../config/db.js";

const AssignmentModel = {
  // Create a new assignment
  async create({ lessonId, title, description, deadline }) {
    try {
      console.log('=== ASSIGNMENT MODEL CREATE DEBUG ===');
      console.log('Received parameters:', { lessonId, title, description, deadline });
      
      const { rows } = await query(
        `INSERT INTO assignments (lesson_id, title, description, deadline)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [lessonId, title, description, deadline]
      );
      
      console.log('Created assignment in database:', rows[0]);
      return rows[0];
    } catch (error) {
      console.error("Error creating assignment:", error);
      throw error;
    }
  },

  // Get assignment by ID
  async getById(id) {
    try {
      const { rows } = await query(
        `SELECT a.*, l.title as lesson_title, m.title as module_title, c.title as course_title, c.id as course_id
         FROM assignments a
         JOIN lessons l ON a.lesson_id = l.id
         JOIN modules m ON l.module_id = m.id
         JOIN courses c ON m.course_id = c.id
         WHERE a.id = $1`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error("Error getting assignment:", error);
      throw error;
    }
  },

  // Get assignment by ID with submission status for a specific user
  async getByIdWithSubmission(id, userId = null) {
    try {
      let queryText, queryParams;
      
      if (userId) {
        // Include submission status for the specific user
        queryText = `
          SELECT a.*, 
                 l.title as lesson_title, 
                 m.title as module_title, 
                 c.title as course_title,
                 s.id as submission_id,
                 s.submission_url,
                 s.submitted_at,
                 s.grade,
                 s.feedback,
                 s.graded_at,
                 CASE WHEN s.id IS NOT NULL THEN 'Submitted' ELSE 'Pending' END as status
          FROM assignments a
          JOIN lessons l ON a.lesson_id = l.id
          JOIN modules m ON l.module_id = m.id
          JOIN courses c ON m.course_id = c.id
          LEFT JOIN submissions s ON a.id = s.assignment_id AND s.user_id = $2
          WHERE a.id = $1`;
        queryParams = [id, userId];
      } else {
        // Fallback to original query without submission status
        queryText = `
          SELECT a.*, 
                 l.title as lesson_title, 
                 m.title as module_title, 
                 c.title as course_title
          FROM assignments a
          JOIN lessons l ON a.lesson_id = l.id
          JOIN modules m ON l.module_id = m.id
          JOIN courses c ON m.course_id = c.id
          WHERE a.id = $1`;
        queryParams = [id];
      }
      
      const { rows } = await query(queryText, queryParams);
      return rows[0];
    } catch (error) {
      console.error("Error getting assignment with submission:", error);
      throw error;
    }
  },

  // Get assignments by lesson ID
  async getByLessonId(lessonId, userId = null) {
    try {
      let queryText, queryParams;
      
      if (userId) {
        // Include submission status for the specific user
        queryText = `
          SELECT a.*, 
                 s.id as submission_id,
                 s.submission_url,
                 s.submitted_at,
                 s.grade,
                 s.feedback,
                 s.graded_at,
                 CASE WHEN s.id IS NOT NULL THEN 'Submitted' ELSE 'Pending' END as status
          FROM assignments a
          LEFT JOIN submissions s ON a.id = s.assignment_id AND s.user_id = $2
          WHERE a.lesson_id = $1
          ORDER BY a.id ASC`;
        queryParams = [lessonId, userId];
      } else {
        // Original query without submission status
        queryText = `SELECT * FROM assignments WHERE lesson_id = $1 ORDER BY id ASC`;
        queryParams = [lessonId];
      }
      
      const { rows } = await query(queryText, queryParams);
      return rows;
    } catch (error) {
      console.error("Error getting assignments by lesson:", error);
      throw error;
    }
  },

  // Update assignment
  async update(id, { title, description, deadline }) {
    try {
      const { rows } = await query(
        `UPDATE assignments
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             deadline = COALESCE($3, deadline)
         WHERE id = $4
         RETURNING *`,
        [title, description, deadline, id]
      );
      return rows[0];
    } catch (error) {
      console.error("Error updating assignment:", error);
      throw error;
    }
  },

  // Delete assignment
  async delete(id) {
    try {
      // Start transaction
      await query('BEGIN');
      
      // Delete submissions for this assignment
      await query(
        `DELETE FROM submissions WHERE assignment_id = $1`,
        [id]
      );
      
      // Delete the assignment
      const { rowCount } = await query(
        `DELETE FROM assignments WHERE id = $1`,
        [id]
      );
      
      await query('COMMIT');
      return rowCount > 0;
    } catch (error) {
      await query('ROLLBACK');
      console.error("Error deleting assignment:", error);
      throw error;
    }
  },

  // Get submissions for an assignment
  async getSubmissions(assignmentId) {
    try {
      const { rows } = await query(
        `SELECT 
           s.id,
           s.user_id,
           s.assignment_id,
           s.submission_url,
           s.submitted_at,
           s.grade,
           s.feedback,
           s.graded_at,
           u.name as user_name,
           u.email as user_email
         FROM submissions s
         JOIN users u ON s.user_id = u.id
         WHERE s.assignment_id = $1
         ORDER BY s.submitted_at DESC`,
        [assignmentId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting assignment submissions:', error);
      throw error;
    }
  },

  // Submit assignment
  async submitAssignment({ assignmentId, userId, submissionUrl }) {
    try {
      const { rows } = await query(
        `INSERT INTO submissions (assignment_id, user_id, submission_url, submitted_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (assignment_id, user_id) 
         DO UPDATE SET submission_url = $3, submitted_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [assignmentId, userId, submissionUrl]
      );
      return rows[0];
    } catch (error) {
      console.error("Error submitting assignment:", error);
      throw error;
    }
  },

  // Grade submission
  async gradeSubmission(submissionId, { grade, feedback }) {
    try {
      const { rows } = await query(
        `UPDATE submissions
         SET grade = $1, feedback = $2, graded_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [grade, feedback, submissionId]
      );
      return rows[0];
    } catch (error) {
      console.error("Error grading submission:", error);
      throw error;
    }
  },

  // Get all assignments for an instructor
  async getInstructorAssignments(instructorId) {
    try {
      const { rows } = await query(
        `SELECT a.*, 
               l.title as lesson_title, 
               m.title as module_title, 
               c.title as course_title,
               c.id as course_id,
               COUNT(s.id) as submission_count,
               COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_count
         FROM assignments a
         JOIN lessons l ON a.lesson_id = l.id
         JOIN modules m ON l.module_id = m.id
         JOIN courses c ON m.course_id = c.id
         LEFT JOIN submissions s ON a.id = s.assignment_id
         WHERE c.instructor_id = $1
         GROUP BY a.id, l.title, m.title, c.title, c.id
         ORDER BY a.deadline DESC`,
        [instructorId]
      );
      return rows;
    } catch (error) {
      console.error("Error getting instructor assignments:", error);
      throw error;
    }
  },

  // Delete submission
  async deleteSubmission(assignmentId, userId) {
    try {
      const { rows } = await query(
        `DELETE FROM submissions
         WHERE assignment_id = $1 AND user_id = $2
         RETURNING *`,
        [assignmentId, userId]
      );
      return rows[0]; // Returns the deleted submission or undefined if not found
    } catch (error) {
      console.error("Error deleting submission:", error);
      throw error;
    }
  }
};

export default AssignmentModel;