import { query } from "../config/db.js";

const LessonCompletionModel = {
  async markComplete(userId, lessonId) {
    try {
      console.log('LessonCompletionModel.markComplete called with:', { userId, lessonId });
      const { rows } = await query(
        `INSERT INTO lesson_completions (user_id, lesson_id, completed_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, lesson_id) DO NOTHING
         RETURNING *`,
        [userId, lessonId]
      );
      console.log('Database query result:', { rowCount: rows.length, firstRow: rows[0] });
      return rows[0];
    } catch (error) {
      console.error("Error marking lesson complete:", error);
      throw error;
    }
  },

  async isCompleted(userId, lessonId) {
    const { rows } = await query(
      `SELECT 1 FROM lesson_completions 
       WHERE user_id = $1 AND lesson_id = $2`,
      [userId, lessonId]
    );
    return rows.length > 0;
  },

  async getCompletedLessons(userId) {
    try {
      const { rows } = await query(
        `SELECT lc.lesson_id, lc.completed_at, l.title, m.title as module_title, c.title as course_title
         FROM lesson_completions lc
         JOIN lessons l ON lc.lesson_id = l.id
         JOIN modules m ON l.module_id = m.id
         JOIN courses c ON m.course_id = c.id
         WHERE lc.user_id = $1
         ORDER BY lc.completed_at DESC`,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error("Error getting completed lessons:", error);
      throw error;
    }
  },

  async getCompletedLessonsByCourse(userId, courseId) {
    try {
      const { rows } = await query(
        `SELECT lc.lesson_id, lc.completed_at, l.title, m.title as module_title
         FROM lesson_completions lc
         JOIN lessons l ON lc.lesson_id = l.id
         JOIN modules m ON l.module_id = m.id
         WHERE lc.user_id = $1 AND m.course_id = $2
         ORDER BY m.order_num, l.order_num`,
        [userId, courseId]
      );
      return rows;
    } catch (error) {
      console.error("Error getting completed lessons by course:", error);
      throw error;
    }
  },

  async getAllCompletedLessonsByCourse(courseId) {
    try {
      const { rows } = await query(
        `SELECT lc.user_id, lc.lesson_id, lc.completed_at, l.title, m.title as module_title
         FROM lesson_completions lc
         JOIN lessons l ON lc.lesson_id = l.id
         JOIN modules m ON l.module_id = m.id
         WHERE m.course_id = $1
         ORDER BY lc.user_id, m.order_num, l.order_num`,
        [courseId]
      );
      return rows;
    } catch (error) {
      console.error("Error getting all completed lessons by course:", error);
      throw error;
    }
  },

  async unmarkComplete(userId, lessonId) {
    try {
      const { rows } = await query(
        `DELETE FROM lesson_completions 
         WHERE user_id = $1 AND lesson_id = $2
         RETURNING *`,
        [userId, lessonId]
      );
      return rows[0];
    } catch (error) {
      console.error("Error unmarking lesson complete:", error);
      throw error;
    }
  },

  async getEnrollmentByUserAndLesson(userId, lessonId) {
    try {
      const { rows } = await query(
        `SELECT e.id, e.course_id, e.progress as current_progress
         FROM enrollments e
         JOIN modules m ON e.course_id = m.course_id
         JOIN lessons l ON m.id = l.module_id
         WHERE e.user_id = $1 AND l.id = $2`,
        [userId, lessonId]
      );
      return rows[0];
    } catch (error) {
      console.error("Error getting enrollment by user and lesson:", error);
      throw error;
    }
  }
};

export default LessonCompletionModel;
