import { query } from "../config/db.js";

const QuizModel = {
  // Get quizzes by lesson ID
  async getByLessonId(lessonId) {
    try {
      const { rows } = await query(
        `SELECT q.id, q.title, q.passing_score, q.time_limit, q.max_attempts,
                l.title as lesson_title, c.title as course_title,
                (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count
         FROM quizzes q
         JOIN lessons l ON q.lesson_id = l.id
         JOIN modules m ON l.module_id = m.id
         JOIN courses c ON m.course_id = c.id
         WHERE q.lesson_id = $1 
         ORDER BY q.id`,
        [lessonId]
      );
      return rows;
    } catch (error) {
      console.error("Error getting quizzes by lesson:", error);
      throw error;
    }
  },
  // Get user attempt information for a quiz
  async getUserAttemptInfo(quizId, userId) {
    try {
      if (!userId) return null;
      
      const { rows: existingAttempts } = await query(
        `SELECT COUNT(*) as attempt_count, MAX(attempt_number) as last_attempt
         FROM quiz_results 
         WHERE user_id = $1 AND quiz_id = $2`,
        [userId, quizId]
      );
      
      const attemptCount = parseInt(existingAttempts[0].attempt_count);
      
      // Get quiz max_attempts
      const { rows: [quiz] } = await query(
        `SELECT max_attempts FROM quizzes WHERE id = $1`,
        [quizId]
      );
      
      if (!quiz) return null;
      
      return {
        attemptCount,
        max_attempts: quiz.max_attempts,
        remainingAttempts: quiz.max_attempts ? Math.max(0, quiz.max_attempts - attemptCount) : null,
        canAttempt: !quiz.max_attempts || attemptCount < quiz.max_attempts
      };
    } catch (error) {
      console.error("Error getting user attempt info:", error);
      throw error;
    }
  },

  // Get quiz by ID with questions and options
  async getById(quizId) {
    try {
      // Get quiz details with course information
      const {
        rows: [quiz],
      } = await query(
        `SELECT q.id, q.title, q.passing_score, q.time_limit, q.max_attempts, q.lesson_id,
                l.title as lesson_title, c.title as course_title
         FROM quizzes q
         JOIN lessons l ON q.lesson_id = l.id
         JOIN modules m ON l.module_id = m.id
         JOIN courses c ON m.course_id = c.id
         WHERE q.id = $1`,
        [quizId]
      );
  
      if (!quiz) return null;
  
      // Get questions
      const {
        rows: questions,  // ✅ Changed from [questions] to questions
      } = await query(
        `SELECT id, question_text, question_type, points, order_num
         FROM quiz_questions 
         WHERE quiz_id = $1 
         ORDER BY order_num`,
        [quizId]
      );
  
      // Get options for each question
      for (const question of questions) {
        const { rows: options } = await query(
          `SELECT id, option_text, is_correct, order_num 
           FROM quiz_options 
           WHERE question_id = $1 
           ORDER BY order_num`,
          [question.id]
        );

        question.options = options;
      }
  
      return { ...quiz, questions };
    } catch (error) {
      console.error("Error fetching quiz:", error);
      throw error;
    }
  },

  // Submit and grade quiz attempt
  async gradeAttempt(userId, quizId, answers, startTime = null) {
    try {
      // Validate quiz exists
      const quiz = await this.getById(quizId);
      if (!quiz) throw new Error("Quiz not found");

      // Validate all question IDs exist in the quiz
      const validQuestionIds = quiz.questions.map(q => q.id);
      for (const answer of answers) {
        if (!validQuestionIds.includes(answer.questionId)) {
          throw new Error(`Question ID ${answer.questionId} does not exist in this quiz`);
        }
      }

      // Check existing attempts
      const { rows: existingAttempts } = await query(
        `SELECT COUNT(*) as attempt_count, MAX(attempt_number) as last_attempt
         FROM quiz_results 
         WHERE user_id = $1 AND quiz_id = $2`,
        [userId, quizId]
      );

      const attemptCount = parseInt(existingAttempts[0].attempt_count);
      const nextAttemptNumber = (existingAttempts[0].last_attempt || 0) + 1;

      // Check if user has exceeded max attempts
      if (quiz.max_attempts && attemptCount >= quiz.max_attempts) {
        throw new Error(`Maximum attempts (${quiz.max_attempts}) exceeded for this quiz`);
      }

      // Calculate score
      let score = 0;
      const results = [];

      for (const question of quiz.questions) {
        const userAnswer = answers.find((a) => a.questionId === question.id);
        let isCorrect = false;
        
        // Skip unanswered questions
        if (!userAnswer) {
          results.push({ questionId: question.id, isCorrect: false });
          continue;
        }
      
        // For multiple-choice questions
        if (question.question_type === "multiple_choice") {
          const correctOption = question.options.find((o) => o.is_correct);
          const selectedOptionId = userAnswer?.selected_options?.[0] || userAnswer?.selectedOptions?.[0] || userAnswer?.optionId || userAnswer.selected_options?.[0];
          

          
          // Check if user provided an answer
          if (selectedOptionId === undefined || selectedOptionId === null) {
            isCorrect = false;
          } else {
            // Ensure we have valid numbers
            const selectedId = parseInt(selectedOptionId);
            const correctId = parseInt(correctOption?.id);
            

            
            if (isNaN(selectedId) || isNaN(correctId)) {
              isCorrect = false;
            } else {
              isCorrect = selectedId === correctId;
            }
          }
          

        }
        // For true/false questions
        else if (question.question_type === "true_false") {
          const correctOption = question.options.find((o) => o.is_correct);
          const selectedOptionId = userAnswer?.selected_options?.[0] || userAnswer?.selectedOptions?.[0] || userAnswer?.optionId || userAnswer.selected_options?.[0];
          

          
          // Check if user provided an answer
          if (selectedOptionId === undefined || selectedOptionId === null) {
            isCorrect = false;
          } else {
            // Ensure we have valid numbers
            const selectedId = parseInt(selectedOptionId);
            const correctId = parseInt(correctOption?.id);
            

            
            if (isNaN(selectedId) || isNaN(correctId)) {
              isCorrect = false;
            } else {
              isCorrect = selectedId === correctId;
            }
          }
          

        }
        // For short answer questions
        else if (question.question_type === "short_answer") {
          // For now, short answer questions are manually graded, so mark as correct
          // This could be enhanced with keyword matching or manual review
          const answerText = userAnswer?.selected_options?.[0] || userAnswer?.answerText || '';
          isCorrect = answerText.trim().length > 0; // Basic validation - has content
        }
        
        if (isCorrect) {
          // Handle null points by defaulting to 1 point per question
          const pointsToAdd = question.points || 1;
          score += pointsToAdd;

        }
        
        results.push({ questionId: question.id, isCorrect });
      }

      // Calculate percentage score
      const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);
      let percentageScore = 0;
      if (totalPoints > 0) {
        percentageScore = Math.round((score / totalPoints) * 100);
      }

      
      // Ensure percentageScore is a valid number
      if (isNaN(percentageScore) || !isFinite(percentageScore)) {
        percentageScore = 0;
      }

      // For single attempt quizzes, update existing result if it exists
      if (quiz.max_attempts === 1 && attemptCount > 0) {
        // Update existing attempt
        // Use actual start time for existing attempts
        const actualStartTime = startTime ? new Date(startTime) : new Date();
        const { rows: [attempt] } = await query(
          `UPDATE quiz_results 
           SET score = $1, completed_at = CURRENT_TIMESTAMP,
               started_at = COALESCE(started_at, $4)
           WHERE user_id = $2 AND quiz_id = $3
           RETURNING *`,
          [percentageScore, userId, quizId, actualStartTime]
        );

        // Delete old answers
        await query(
          `DELETE FROM quiz_answers WHERE result_id = $1`,
          [attempt.id]
        );

        // Save new answers
        for (const answer of answers) {
          const selectedOptionId = answer.selected_options?.[0] || answer.selectedOptionId || answer.selectedOptions?.[0] || answer.optionId;
          
          // Handle option ID safely to prevent NaN
          let finalOptionId = null;
          if (selectedOptionId !== undefined && selectedOptionId !== null && selectedOptionId !== '') {
            const parsedOptionId = parseInt(selectedOptionId);
            if (!isNaN(parsedOptionId)) {
              finalOptionId = parsedOptionId;
            }
          }
          
          // Ensure question ID is valid
          const validQuestionId = parseInt(answer.questionId);
          if (isNaN(validQuestionId)) {
            throw new Error(`Invalid question ID: ${answer.questionId}`);
          }
          
          // Find the result and ensure isCorrect is boolean
          const result = results.find((r) => r.questionId === answer.questionId);
          const isCorrect = result ? Boolean(result.isCorrect) : false;
          
          await query(
            `INSERT INTO quiz_answers 
             (result_id, question_id, option_id, answer_text, is_correct)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              attempt.id,
              validQuestionId,
              finalOptionId,
              answer.answerText || null,
              isCorrect,
            ]
          );
        }

        return {
          attempt,
          score: percentageScore,
          passed: percentageScore >= (quiz.passing_score || 0),
          attemptNumber: attempt.attempt_number,
          isRetake: true
        };
      } else {
        // Create new attempt with actual start time
        const actualStartTime = startTime ? new Date(startTime) : new Date();
        const { rows: [attempt] } = await query(
          `INSERT INTO quiz_results 
           (user_id, quiz_id, score, attempt_number, started_at, completed_at) 
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
           RETURNING *`,
          [userId, quizId, percentageScore, nextAttemptNumber, actualStartTime]
        );

        // Save individual answers
        for (const answer of answers) {
          const selectedOptionId = answer.selected_options?.[0] || answer.selectedOptionId || answer.selectedOptions?.[0] || answer.optionId;
          
          // Handle option ID safely to prevent NaN
          let finalOptionId = null;
          if (selectedOptionId !== undefined && selectedOptionId !== null && selectedOptionId !== '') {
            const parsedOptionId = parseInt(selectedOptionId);
            if (!isNaN(parsedOptionId)) {
              finalOptionId = parsedOptionId;
            }
          }
          
          // Ensure question ID is valid
          const validQuestionId = parseInt(answer.questionId);
          if (isNaN(validQuestionId)) {
            throw new Error(`Invalid question ID: ${answer.questionId}`);
          }
          
          // Find the result and ensure isCorrect is boolean
          const result = results.find((r) => r.questionId === answer.questionId);
          const isCorrect = result ? Boolean(result.isCorrect) : false;
          
          await query(
            `INSERT INTO quiz_answers 
             (result_id, question_id, option_id, answer_text, is_correct)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              attempt.id,
              validQuestionId,
              finalOptionId,
              answer.answerText || null,
              isCorrect,
            ]
          );
        }

        return {
          attempt,
          score: percentageScore,
          passed: percentageScore >= (quiz.passing_score || 0),
          attemptNumber: nextAttemptNumber,
          isRetake: attemptCount > 0
        };
      }
    } catch (error) {
      console.error("Error grading quiz:", error);
      throw error;
    }
  },

  // Get quiz results for a user
  async getResults(userId, quizId) {
    const { rows } = await query(
      `SELECT r.*, 
              q.title as quiz_title,
              q.passing_score,
              q.time_limit
       FROM quiz_results r
       JOIN quizzes q ON r.quiz_id = q.id
       WHERE r.user_id = $1 AND r.quiz_id = $2
       ORDER BY r.completed_at DESC`,
      [userId, quizId]
    );
    
    // If we have results, enhance them with detailed statistics
    if (rows.length > 0) {
      const result = rows[0]; // Get the most recent attempt
      
      // Get total questions count
      const { rows: questionRows } = await query(
        `SELECT COUNT(*) as total_questions FROM quiz_questions WHERE quiz_id = $1`,
        [quizId]
      );
      
      // Get answer statistics
      const { rows: answerStats } = await query(
        `SELECT 
           COUNT(*) as total_answers,
           COUNT(CASE WHEN is_correct = true THEN 1 END) as correct_answers,
           COUNT(CASE WHEN is_correct = false THEN 1 END) as incorrect_answers
         FROM quiz_answers 
         WHERE result_id = $1`,
        [result.id]
      );
      
      // Calculate time taken if we have start and completion times
      let timeTaken = 'N/A';
      if (result.started_at && result.completed_at) {
        const startTime = new Date(result.started_at);
        const endTime = new Date(result.completed_at);
        const diffMs = endTime - startTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        timeTaken = `${diffMins}m ${diffSecs}s`;
      }
      
      // Enhance the result with statistics
      result.total_questions = parseInt(questionRows[0].total_questions);
      result.correct_answers = parseInt(answerStats[0].correct_answers || 0);
      result.incorrect_answers = parseInt(answerStats[0].incorrect_answers || 0);
      result.time_taken = timeTaken;
      
      return [result];
    }
    
    return rows;
  },

  // Get all quiz attempts for a user
  async getAllAttempts(userId, quizId) {
    const { rows } = await query(
      `SELECT r.*, 
              q.title as quiz_title,
              q.passing_score,
              q.time_limit
       FROM quiz_results r
       JOIN quizzes q ON r.quiz_id = q.id
       WHERE r.user_id = $1 AND r.quiz_id = $2
       ORDER BY r.attempt_number DESC`,
      [userId, quizId]
    );
    
    // Enhance each result with detailed statistics
    const enhancedResults = [];
    
    for (const result of rows) {
      // Get total questions count
      const { rows: questionRows } = await query(
        `SELECT COUNT(*) as total_questions FROM quiz_questions WHERE quiz_id = $1`,
        [quizId]
      );
      
      // Get answer statistics
      const { rows: answerStats } = await query(
        `SELECT 
           COUNT(*) as total_answers,
           COUNT(CASE WHEN is_correct = true THEN 1 END) as correct_answers,
           COUNT(CASE WHEN is_correct = false THEN 1 END) as incorrect_answers
         FROM quiz_answers 
         WHERE result_id = $1`,
        [result.id]
      );
      
      // Calculate time taken if we have start and completion times
      let timeTaken = 'N/A';
      if (result.started_at && result.completed_at) {
        const startTime = new Date(result.started_at);
        const endTime = new Date(result.completed_at);
        const diffMs = endTime - startTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);
        timeTaken = `${diffMins}m ${diffSecs}s`;
      }
      
      // Enhance the result with statistics
      const enhancedResult = {
        ...result,
        total_questions: parseInt(questionRows[0].total_questions),
        correct_answers: parseInt(answerStats[0].correct_answers || 0),
        incorrect_answers: parseInt(answerStats[0].incorrect_answers || 0),
        time_taken: timeTaken,
        percentage: result.score
      };
      
      enhancedResults.push(enhancedResult);
    }
    
    return enhancedResults;
  },

  // Create a new quiz
  async create({ lessonId, title, passing_score, time_limit, max_attempts = 1, questions }) {
    try {
      console.log("QuizModel.create called with:", {
        lessonId, title, passing_score, time_limit, max_attempts, questions
      });
      
      // Start a transaction
      await query('BEGIN');
      
      // Create the quiz
      const { rows: [quiz] } = await query(
        `INSERT INTO quizzes (lesson_id, title, passing_score, time_limit, max_attempts)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [lessonId, title, passing_score, time_limit, max_attempts]
      );
      
      console.log("Quiz inserted with ID:", quiz.id);
      
      // Create questions and options
      if (questions && questions.length > 0) {
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];
          const { rows: [createdQuestion] } = await query(
            `INSERT INTO quiz_questions 
             (quiz_id, question_text, question_type, points, order_num)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [quiz.id, question.question_text, question.question_type, question.points, i + 1]
          );
          
          // Create options for this question
          if (question.options && question.options.length > 0) {
            for (let j = 0; j < question.options.length; j++) {
              const option = question.options[j];
              await query(
                `INSERT INTO quiz_options
                 (question_id, option_text, is_correct, order_num)
                 VALUES ($1, $2, $3, $4)`,
                [createdQuestion.id, option.option_text, option.is_correct, j + 1]
              );
            }
          }
        }
      }
      
      // Commit the transaction
      await query('COMMIT');
      
      return quiz;
    } catch (error) {
      // Rollback in case of error
      await query('ROLLBACK');
      console.error("Error creating quiz:", error);
      throw error;
    }
  },

  // Update an existing quiz
  async update(quizId, { title, passing_score, time_limit, questions }) {
    try {

      
      // Start a transaction
      await query('BEGIN');
      
      // Update the quiz
      await query(
        `UPDATE quizzes 
         SET title = COALESCE($1, title),
             passing_score = COALESCE($2, passing_score),
             time_limit = COALESCE($3, time_limit)
         WHERE id = $4`,
        [title, passing_score, time_limit, quizId]
      );
      

      
      // Handle questions update
      if (questions !== undefined) {
        // Get current question IDs from database
        const { rows: currentQuestions } = await query(
          `SELECT id FROM quiz_questions WHERE quiz_id = $1`,
          [quizId]
        );
        const currentQuestionIds = currentQuestions.map(q => q.id);
        
        // Get question IDs from the update payload
        const updatedQuestionIds = questions
          .filter(q => q.id)
          .map(q => q.id);
        
        // Find questions to delete (exist in DB but not in update)
        const questionsToDelete = currentQuestionIds.filter(
          id => !updatedQuestionIds.includes(id)
        );
        

        
        // Delete removed questions and their options
        if (questionsToDelete.length > 0) {

          
          // Delete options first
          await query(
            `DELETE FROM quiz_options 
             WHERE question_id IN (${questionsToDelete.map((_, i) => `$${i + 1}`).join(',')})`,
            questionsToDelete
          );
          
          // Delete quiz answers for these questions
          await query(
            `DELETE FROM quiz_answers 
             WHERE question_id IN (${questionsToDelete.map((_, i) => `$${i + 1}`).join(',')})`,
            questionsToDelete
          );
          
          // Delete the questions
          await query(
            `DELETE FROM quiz_questions 
             WHERE id IN (${questionsToDelete.map((_, i) => `$${i + 1}`).join(',')})`,
            questionsToDelete
          );
          

        }
        
        // Process remaining questions (update existing and create new)
        for (const question of questions) {
          if (question.id) {
            // Update existing question

            await query(
              `UPDATE quiz_questions
               SET question_text = $1, question_type = $2, points = $3, order_num = $4
               WHERE id = $5 AND quiz_id = $6`,
              [question.question_text, question.question_type, question.points, question.orderNum, question.id, quizId]
            );
            
            // Handle options for this question
            if (question.options && question.options.length > 0) {
              // Delete existing options not in the update
              const optionIds = question.options
                .filter(opt => opt.id)
                .map(opt => opt.id);
              
              if (optionIds.length > 0) {
                await query(
                  `DELETE FROM quiz_options 
                   WHERE question_id = $1 AND id NOT IN (${optionIds.map((_, i) => `$${i + 2}`).join(',')})`,
                  [question.id, ...optionIds]
                );
              } else {
                await query(
                  `DELETE FROM quiz_options WHERE question_id = $1`,
                  [question.id]
                );
              }
              
              // Update or insert options
              for (const option of question.options) {
                if (option.id) {
                  // Update existing option
                  await query(
                    `UPDATE quiz_options
                     SET option_text = $1, is_correct = $2
                     WHERE id = $3`,
                    [option.option_text, option.is_correct, option.id]
                  );
                } else {
                  // Insert new option
                  await query(
                    `INSERT INTO quiz_options (question_id, option_text, is_correct)
                     VALUES ($1, $2, $3)`,
                    [question.id, option.option_text, option.is_correct]
                  );
                }
              }
            }
          } else {
            // Insert new question
            const { rows: [createdQuestion] } = await query(
              `INSERT INTO quiz_questions 
               (quiz_id, question_text, question_type, points, order_num)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id`,
              [quizId, question.question_text, question.question_type, question.points, question.orderNum]
            );
            
            // Create options for this question
            if (question.options && question.options.length > 0) {
              for (let j = 0; j < question.options.length; j++) {
                const option = question.options[j];
                await query(
                  `INSERT INTO quiz_options
                   (question_id, option_text, is_correct, order_num)
                   VALUES ($1, $2, $3, $4)`,
                  [createdQuestion.id, option.option_text, option.is_correct, j + 1]
                );
              }
            }
          }
        }
      }
      
      // Commit the transaction
      await query('COMMIT');
      

      
      // Return the updated quiz
      return this.getById(quizId);
    } catch (error) {
      // Rollback in case of error
      await query('ROLLBACK');
      
      console.error(`Error updating quiz ID: ${quizId}`, {
        error: error.message,
        stack: error.stack,
        quizId,
        title,
        passing_score,
        time_limit,
        questionsCount: questions?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  },

  // Delete a quiz
  async delete(quizId) {
    try {
      // Start a transaction
      await query('BEGIN');
      
      // Delete all related records (cascade should handle this, but being explicit)
      // Delete quiz answers
      await query(
        `DELETE FROM quiz_answers 
         WHERE question_id IN (
           SELECT id FROM quiz_questions WHERE quiz_id = $1
         )`,
        [quizId]
      );
      
      // Delete quiz results
      await query(
        `DELETE FROM quiz_results WHERE quiz_id = $1`,
        [quizId]
      );
      
      // Delete quiz options and questions
      await query(
        `DELETE FROM quiz_options 
         WHERE question_id IN (
           SELECT id FROM quiz_questions WHERE quiz_id = $1
         )`,
        [quizId]
      );
      
      await query(
        `DELETE FROM quiz_questions WHERE quiz_id = $1`,
        [quizId]
      );
      
      // Finally delete the quiz
      const { rowCount } = await query(
        `DELETE FROM quizzes WHERE id = $1`,
        [quizId]
      );
      
      // Commit the transaction
      await query('COMMIT');
      
      return rowCount > 0;
    } catch (error) {
      // Rollback in case of error
      await query('ROLLBACK');
      console.error("Error deleting quiz:", error);
      throw error;
    }
  },

  // Get enrollment by user and quiz
  async getEnrollmentByUserAndQuiz(quizId, userId) {
    try {
      const {
        rows: [enrollment],
      } = await query(
        `SELECT e.id FROM enrollments e
            JOIN lessons l ON e.course_id = (
              SELECT m.course_id FROM modules m
              JOIN lessons ON m.id = lessons.module_id
              JOIN quizzes ON lessons.id = quizzes.lesson_id
              WHERE quizzes.id = $1
            )
            WHERE e.user_id = $2`,
        [quizId, userId]
      );
      return enrollment;
    } catch (error) {
      console.error("Error fetching enrollment by user and quiz:", error);
      throw error;
    }
  },

  // Get all quizzes for user's enrolled courses with attempts
  async getUserQuizzesWithAttempts(userId) {
    try {
      const { rows } = await query(
        `SELECT 
          q.id,
          q.title,
          q.passing_score,
          q.time_limit,
          q.max_attempts,
          l.title as lesson_title,
          l.id as lesson_id,
          c.title as course_title,
          c.id as course_id,
          (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count,
          -- Get best attempt info
          COALESCE(best_attempt.score, 0) as best_score,
          best_attempt.attempt_number as best_attempt_number,
          best_attempt.completed_at as best_completed_at,
          COALESCE(attempt_count.total_attempts, 0) as total_attempts
        FROM quizzes q
        JOIN lessons l ON q.lesson_id = l.id
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN (
          -- Get best attempt (highest score) for each quiz
          SELECT 
            quiz_id,
            score,
            attempt_number,
            completed_at,
            ROW_NUMBER() OVER (PARTITION BY quiz_id ORDER BY score DESC, completed_at DESC) as rn
          FROM quiz_results
          WHERE user_id = $1
        ) best_attempt ON q.id = best_attempt.quiz_id AND best_attempt.rn = 1
        LEFT JOIN (
          -- Get total attempt count for each quiz
          SELECT 
            quiz_id,
            COUNT(*) as total_attempts
          FROM quiz_results
          WHERE user_id = $1
          GROUP BY quiz_id
        ) attempt_count ON q.id = attempt_count.quiz_id
        WHERE e.user_id = $1
        ORDER BY c.title, l.title, q.title`,
        [userId]
      );
      
      return rows.map(row => ({
        id: row.id,
        title: row.title,
        passing_score: row.passing_score,
        time_limit: row.time_limit,
        max_attempts: row.max_attempts,
        lesson_title: row.lesson_title,
        lesson_id: row.lesson_id,
        course_title: row.course_title,
        course_id: row.course_id,
        question_count: row.question_count,
        // Best attempt info
        best_attempt: row.best_attempt_number ? {
          score: row.best_score,
          total_score: 100, // Score is stored as percentage (0-100)
          attempt_number: row.best_attempt_number,
          completed_at: row.best_completed_at
        } : null,
        total_attempts: row.total_attempts
      }));
    } catch (error) {
      console.error("Error fetching user quizzes with attempts:", error);
      throw error;
    }
  },
};

export default QuizModel;