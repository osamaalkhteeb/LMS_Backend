import express from "express";
import { query } from "../config/db.js";

const router = express.Router();

// Debug endpoint to check course data
router.get("/course-debug", async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    
    // Get all courses with their status
    const { rows: allCourses } = await query(`
      SELECT id, title, is_published, is_approved, created_at
      FROM courses
      ORDER BY created_at DESC
    `);
    
    // Get course stats
    const { rows: courseStats } = await query(`
      SELECT 
        COUNT(*) as total_courses,
        COUNT(CASE WHEN is_published = true AND is_approved = true THEN 1 END) as published_courses,
        COUNT(CASE WHEN is_published = true AND is_approved = false THEN 1 END) as pending_courses,
        COUNT(CASE WHEN is_published = false THEN 1 END) as draft_courses
      FROM courses
    `);
    
    res.json({
      success: true,
      data: {
        allCourses,
        courseStats: courseStats[0]
      }
    });
  } catch (error) {
    console.error('Course debug error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint to check quiz data
router.get("/quiz-debug", async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    
    // Get total quizzes count
    const { rows: totalQuizzes } = await query("SELECT COUNT(*) as count FROM quizzes");
    
    // Get all quizzes with their lesson associations
    const { rows: allQuizzes } = await query(`
      SELECT q.id, q.title, q.lesson_id, l.title as lesson_title, l.content_type, l.module_id, m.title as module_title
      FROM quizzes q
      JOIN lessons l ON q.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      ORDER BY m.id, l.order_num, q.id
    `);
    
    // Get lessons with content_type = 'quiz'
    const { rows: quizLessons } = await query(`
      SELECT id, title, content_type, module_id
      FROM lessons
      WHERE content_type = 'quiz'
      ORDER BY id
    `);
    
    // Get quiz distribution by module
    const { rows: quizByModule } = await query(`
      SELECT m.id as module_id, m.title as module_title, m.course_id, 
             COUNT(q.id) as quiz_count
      FROM modules m
      LEFT JOIN lessons l ON m.id = l.module_id AND l.content_type = 'quiz'
      LEFT JOIN quizzes q ON l.id = q.lesson_id
      GROUP BY m.id, m.title, m.course_id
      ORDER BY m.id
    `);
    
    // Get lessons by module with quiz info
    const { rows: lessonsByModule } = await query(`
      SELECT m.id as module_id, m.title as module_title,
             l.id as lesson_id, l.title as lesson_title, l.content_type,
             q.id as quiz_id, q.title as quiz_title
      FROM modules m
      LEFT JOIN lessons l ON m.id = l.module_id
      LEFT JOIN quizzes q ON l.id = q.lesson_id
      ORDER BY m.id, l.id
    `);
    
    res.json({
      totalQuizzes: parseInt(totalQuizzes[0].count),
      totalQuizzesFound: allQuizzes.length,
      totalQuizLessons: quizLessons.length,
      allQuizzes,
      quizLessons,
      quizByModule,
      lessonsByModule,
      summary: {
        quizzesInDB: parseInt(totalQuizzes[0].count),
        quizzesLinkedToLessons: allQuizzes.length,
        lessonsWithQuizType: quizLessons.length
      }
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

export default router;