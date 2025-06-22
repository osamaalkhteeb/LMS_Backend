import { query } from "../config/db.js";

const LessonModel = {
  // Create a lesson
  async create({ moduleId, title, contentType, contentUrl, duration, orderNum, cloudinaryPublicId }) {
    console.log('=== LESSON MODEL CREATE DEBUG ===');
    console.log('Received parameters:', { moduleId, title, contentType, contentUrl, duration, orderNum, cloudinaryPublicId });
    
    const { rows } = await query(
      `INSERT INTO lessons 
       (module_id, title, content_type, content_url, duration, order_num, cloudinary_public_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [moduleId, title, contentType, contentUrl, duration, orderNum, cloudinaryPublicId]
    );
    
    console.log('Created lesson in database:', rows[0]);
    return rows[0];
  },

  // Get lesson with full details
  async getById(lessonId) {
    const { rows: [lesson] } = await query(
      `SELECT l.*, m.course_id,
              (SELECT q.id FROM quizzes q WHERE q.lesson_id = l.id) AS quiz_id,
              (SELECT a.id FROM assignments a WHERE a.lesson_id = l.id) AS assignment_id
       FROM lessons l
       JOIN modules m ON l.module_id = m.id
       WHERE l.id = $1`,
      [lessonId]
    );
    return lesson;
  },
  
  // Update a lesson
  async update(lessonId, { title, contentType, contentUrl, duration, orderNum, passing_score, time_limit, max_attempts, description, points, deadline }) {
    // Start transaction
    await query('BEGIN');
    
    try {
      // Update the lesson
      const { rows: [updatedLesson] } = await query(
        `UPDATE lessons
         SET title = COALESCE($1, title),
             content_type = COALESCE($2, content_type),
             content_url = COALESCE($3, content_url),
             duration = COALESCE($4, duration),
             order_num = COALESCE($5, order_num)
         WHERE id = $6
         RETURNING *`,
        [title, contentType, contentUrl, duration, orderNum, lessonId]
      );
      
      // Handle quiz-specific fields
      if (contentType === 'quiz' && (passing_score !== undefined || time_limit !== undefined || max_attempts !== undefined)) {
        // Check if quiz exists
        const { rows: existingQuiz } = await query(
          `SELECT id FROM quizzes WHERE lesson_id = $1`,
          [lessonId]
        );
        
        if (existingQuiz.length > 0) {
          // Update existing quiz
          await query(
            `UPDATE quizzes
             SET title = COALESCE($1, title),
                 passing_score = COALESCE($2, passing_score),
                 time_limit = COALESCE($3, time_limit),
                 max_attempts = COALESCE($4, max_attempts)
             WHERE lesson_id = $5`,
            [title, passing_score, time_limit, max_attempts, lessonId]
          );
        } else {
          // Create new quiz
          await query(
            `INSERT INTO quizzes (lesson_id, title, passing_score, time_limit, max_attempts)
             VALUES ($1, $2, $3, $4, $5)`,
            [lessonId, title, passing_score || 70, time_limit || 30, max_attempts || 3]
          );
        }
      }
      
      // Handle assignment-specific fields
      if (contentType === 'assignment' && (description !== undefined || points !== undefined || deadline !== undefined)) {
        // Check if assignment exists
        const { rows: existingAssignment } = await query(
          `SELECT id FROM assignments WHERE lesson_id = $1`,
          [lessonId]
        );
        
        if (existingAssignment.length > 0) {
          // Update existing assignment
          await query(
            `UPDATE assignments
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 points = COALESCE($3, points),
                 deadline = COALESCE($4, deadline)
             WHERE lesson_id = $5`,
            [title, description, points, deadline, lessonId]
          );
        } else {
          // Create new assignment
          await query(
            `INSERT INTO assignments (lesson_id, title, description, points, deadline)
             VALUES ($1, $2, $3, $4, $5)`,
            [lessonId, title, description || '', points || 100, deadline]
          );
        }
      }
      
      await query('COMMIT');
      return updatedLesson;
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  },
  
  // Delete a lesson
  async delete(lessonId) {
    // Start transaction
    await query('BEGIN');
    
    try {
      // Delete associated quizzes
      await query(
        `DELETE FROM quizzes WHERE lesson_id = $1`,
        [lessonId]
      );
      
      // Delete associated assignments
      await query(
        `DELETE FROM assignments WHERE lesson_id = $1`,
        [lessonId]
      );
      
      // Delete lesson completions
      await query(
        `DELETE FROM lesson_completions WHERE lesson_id = $1`,
        [lessonId]
      );
      
      // Delete video notes
      await query(
        `DELETE FROM video_notes WHERE lesson_id = $1`,
        [lessonId]
      );
      
      // Delete the lesson
      const { rowCount } = await query(
        `DELETE FROM lessons WHERE id = $1`,
        [lessonId]
      );
      
      await query('COMMIT');
      return rowCount > 0;
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }
};

export default LessonModel;