import { query } from "../config/db.js";

// Get basic system statistics
const getSystemStatistics = async () => {
  const userCountResult = await query('SELECT COUNT(*) as count FROM users');
  const courseCountResult = await query('SELECT COUNT(*) as count FROM courses');
  const enrollmentCountResult = await query('SELECT COUNT(*) as count FROM enrollments');
  
  return {
    totalUsers: parseInt(userCountResult.rows[0].count),
    totalCourses: parseInt(courseCountResult.rows[0].count),
    totalEnrollments: parseInt(enrollmentCountResult.rows[0].count)
  };
};

// Test database connection and response time
const testDatabaseConnection = async () => {
  const dbStart = Date.now();
  await query('SELECT 1');
  const dbResponseTime = Date.now() - dbStart;
  return dbResponseTime;
};

// Get user statistics for reports
const getUserStatistics = async () => {
  const userStats = await query(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_7d,
      COUNT(CASE WHEN role = 'instructor' THEN 1 END) as instructors,
      COUNT(CASE WHEN role = 'student' THEN 1 END) as students,
      COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '30 days' THEN 1 END) as active_users,
      COALESCE((
        SELECT COUNT(DISTINCT user_id) 
        FROM enrollments
      ), 0) as users_with_enrollments,
      COALESCE((
        SELECT COUNT(DISTINCT user_id) 
        FROM enrollments 
        WHERE completed_at IS NOT NULL
      ), 0) as users_with_completions
    FROM users
  `);
  return userStats.rows[0];
};

// Get course statistics for reports
const getCourseStatistics = async () => {
  const courseStats = await query(`
    SELECT 
      COUNT(*) as total_courses,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_courses_30d,
      AVG((SELECT COUNT(*) FROM enrollments WHERE course_id = courses.id)) as avg_enrollments
    FROM courses
  `);
  return courseStats.rows[0];
};

// Get enrollment statistics for reports
const getEnrollmentStatistics = async () => {
  const enrollmentStats = await query(`
    SELECT 
      COALESCE(COUNT(*), 0) as total_enrollments,
      COALESCE(COUNT(CASE WHEN enrolled_at >= NOW() - INTERVAL '30 days' THEN 1 END), 0) as new_enrollments_30d,
      COALESCE(COUNT(CASE WHEN enrolled_at >= NOW() - INTERVAL '7 days' THEN 1 END), 0) as new_enrollments_7d,
      COALESCE(COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END), 0) as completed_enrollments,
      COALESCE(COUNT(CASE WHEN progress > 0 AND completed_at IS NULL THEN 1 END), 0) as active_enrollments,
      COALESCE(ROUND(AVG(progress), 2), 0) as average_progress,
      COALESCE(COUNT(DISTINCT course_id), 0) as courses_with_enrollments,
      COALESCE(COUNT(DISTINCT user_id), 0) as users_with_enrollments
    FROM enrollments
  `);
  return enrollmentStats.rows[0];
};

// Get historical user growth data
const getUserGrowthData = async (period, startDate, endDate) => {
  const userGrowthQuery = `
    SELECT 
      DATE_TRUNC($1, created_at) as period,
      COUNT(*) as new_users,
      SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC($1, created_at)) as total_users
    FROM users 
    WHERE created_at BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC($1, created_at)
    ORDER BY period
  `;
  
  const result = await query(userGrowthQuery, [period, startDate, endDate]);
  return result.rows;
};

// Get historical course growth data
const getCourseGrowthData = async (period, startDate, endDate) => {
  const courseGrowthQuery = `
    WITH period_data AS (
      SELECT 
        DATE_TRUNC($1, created_at) as period,
        COUNT(*) as new_courses
      FROM courses 
      WHERE created_at BETWEEN $2 AND $3
      GROUP BY DATE_TRUNC($1, created_at)
    ),
    cumulative_data AS (
      SELECT 
        period,
        new_courses,
        (
          SELECT COUNT(*) 
          FROM courses 
          WHERE created_at <= period + CASE 
            WHEN $1 = 'day' THEN INTERVAL '1 day'
            WHEN $1 = 'week' THEN INTERVAL '1 week'
            WHEN $1 = 'month' THEN INTERVAL '1 month'
            ELSE INTERVAL '1 day'
          END - INTERVAL '1 second'
        ) as total_courses
      FROM period_data
    )
    SELECT * FROM cumulative_data ORDER BY period
  `;
  
  const result = await query(courseGrowthQuery, [period, startDate, endDate]);
  return result.rows;
};

// Get historical enrollment trends
const getEnrollmentTrendsData = async (period, startDate, endDate) => {
  const enrollmentTrendsQuery = `
    SELECT 
      DATE_TRUNC($1, enrolled_at) as period,
      COUNT(*) as new_enrollments,
      SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC($1, enrolled_at)) as total_enrollments
    FROM enrollments 
    WHERE enrolled_at BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC($1, enrolled_at)
    ORDER BY period
  `;
  
  const result = await query(enrollmentTrendsQuery, [period, startDate, endDate]);
  return result.rows;
};

// Get completion rate trends
const getCompletionRateData = async (period, startDate, endDate) => {
  const completionRateQuery = `
    SELECT 
      DATE_TRUNC($1, enrolled_at) as period,
      COUNT(*) as total_enrollments,
      COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_enrollments,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2)
        ELSE 0 
      END as completion_rate
    FROM enrollments 
    WHERE enrolled_at BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC($1, enrolled_at)
    ORDER BY period
  `;
  
  const result = await query(completionRateQuery, [period, startDate, endDate]);
  return result.rows;
};

// Get active users data
const getActiveUsersData = async (period, startDate, endDate) => {
  const activeUsersQuery = `
    SELECT 
      DATE_TRUNC($1, enrolled_at) as period,
      COUNT(DISTINCT user_id) as active_users
    FROM enrollments 
    WHERE enrolled_at BETWEEN $2 AND $3
    GROUP BY DATE_TRUNC($1, enrolled_at)
    ORDER BY period
  `;
  
  const result = await query(activeUsersQuery, [period, startDate, endDate]);
  return result.rows;
};

// Get comprehensive user data for detailed reports
const getDetailedUserData = async () => {
  const userDataQuery = `
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_7d,
      COUNT(CASE WHEN role = 'instructor' THEN 1 END) as instructors,
      COUNT(CASE WHEN role = 'student' THEN 1 END) as students,
      COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
      COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '30 days' THEN 1 END) as active_users_30d,
      COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '7 days' THEN 1 END) as active_users_7d,
      COUNT(CASE WHEN last_login_at IS NULL THEN 1 END) as never_logged_in,
      AVG(EXTRACT(DAY FROM NOW() - created_at)) as avg_account_age_days
    FROM users
  `;
  
  const enrollmentDataQuery = `
    SELECT 
      COALESCE(
        (SELECT COUNT(DISTINCT user_id) FROM enrollments), 
        0
      ) as users_with_enrollments,
      COALESCE(
        (SELECT AVG(enrollment_count) FROM (
          SELECT user_id, COUNT(*) as enrollment_count
          FROM enrollments
          GROUP BY user_id
        ) user_enrollments), 
        0
      ) as avg_enrollments_per_user,
      COALESCE(
        (SELECT MAX(enrollment_count) FROM (
          SELECT user_id, COUNT(*) as enrollment_count
          FROM enrollments
          GROUP BY user_id
        ) user_enrollments), 
        0
      ) as max_enrollments_per_user
  `;
  
  const completionDataQuery = `
    SELECT 
      COALESCE(
        (SELECT COUNT(DISTINCT user_id) FROM enrollments WHERE completed_at IS NOT NULL), 
        0
      ) as users_with_completions,
      COALESCE(
        (SELECT AVG(completion_count) FROM (
          SELECT user_id, COUNT(*) as completion_count
          FROM enrollments
          WHERE completed_at IS NOT NULL
          GROUP BY user_id
        ) user_completions), 
        0
      ) as avg_completions_per_user,
      COALESCE(
        (SELECT COUNT(DISTINCT user_id) 
         FROM enrollments 
         WHERE completed_at IS NOT NULL 
         AND completed_at >= NOW() - INTERVAL '30 days'), 
        0
      ) as users_completed_recently
  `;
  
  const [userData, enrollmentData, completionData] = await Promise.all([
    query(userDataQuery),
    query(enrollmentDataQuery),
    query(completionDataQuery)
  ]);
  
  return {
    ...userData.rows[0],
    ...enrollmentData.rows[0],
    ...completionData.rows[0]
  };
};

// Get comprehensive course data for detailed reports
const getDetailedCourseData = async () => {
  const courseDataQuery = `
    SELECT 
      COUNT(*) as total_courses,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_courses_30d,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_courses_7d,
      COUNT(CASE WHEN is_published = true THEN 1 END) as published_courses,
      COUNT(CASE WHEN is_published = false THEN 1 END) as draft_courses,
      AVG(EXTRACT(DAY FROM NOW() - created_at)) as avg_course_age_days
    FROM courses
  `;
  
  const enrollmentStatsQuery = `
    SELECT 
      COUNT(*) as total_enrollments,
      AVG(enrollment_count) as avg_enrollments_per_course,
      MAX(enrollment_count) as max_enrollments_per_course,
      COUNT(CASE WHEN enrollment_count = 0 THEN 1 END) as courses_with_no_enrollments
    FROM (
      SELECT course_id, COUNT(*) as enrollment_count
      FROM enrollments
      GROUP BY course_id
    ) course_enrollments
    RIGHT JOIN courses ON courses.id = course_enrollments.course_id
  `;
  
  const completionStatsQuery = `
    SELECT 
      AVG(completion_rate) as avg_completion_rate,
      COUNT(CASE WHEN completion_rate >= 80 THEN 1 END) as high_completion_courses,
      COUNT(CASE WHEN completion_rate < 20 THEN 1 END) as low_completion_courses
    FROM (
      SELECT 
        course_id,
        CASE 
          WHEN COUNT(*) > 0 THEN 
            (COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)) * 100
          ELSE 0 
        END as completion_rate
      FROM enrollments
      GROUP BY course_id
    ) course_completion_rates
  `;
  
  const [courseData, enrollmentStats, completionStats] = await Promise.all([
    query(courseDataQuery),
    query(enrollmentStatsQuery),
    query(completionStatsQuery)
  ]);
  
  return {
    ...courseData.rows[0],
    ...enrollmentStats.rows[0],
    ...completionStats.rows[0]
  };
};

// Get comprehensive system health data
const getSystemHealthData = async () => {
  const dbResponseTime = await testDatabaseConnection();
  
  const systemStatsQuery = `
    SELECT 
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM courses) as total_courses,
      (SELECT COUNT(*) FROM enrollments) as total_enrollments,
      (SELECT COUNT(*) FROM lessons) as total_lessons,
      (SELECT COUNT(*) FROM quizzes) as total_quizzes,
      (SELECT COUNT(*) FROM assignments) as total_assignments
  `;
  
  const performanceQuery = `
    SELECT 
      COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as daily_active_users,
      COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_active_users,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_users_today,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_this_week
    FROM users
  `;
  
  const storageQuery = `
    SELECT 
      pg_size_pretty(pg_database_size(current_database())) as database_size,
      COUNT(*) as total_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `;
  
  const [systemStats, performanceStats, storageStats] = await Promise.all([
    query(systemStatsQuery),
    query(performanceQuery),
    query(storageQuery)
  ]);
  
  return {
    database_response_time_ms: dbResponseTime,
    database_status: dbResponseTime < 100 ? 'Excellent' : dbResponseTime < 500 ? 'Good' : 'Slow',
    uptime_status: 'Online',
    server_status: 'Healthy',
    ...systemStats.rows[0],
    ...performanceStats.rows[0],
    ...storageStats.rows[0]
  };
};

// Get detailed enrollment data
const getDetailedEnrollmentData = async () => {

  
  const enrollmentDataQuery = `
    SELECT 
      COALESCE(COUNT(*), 0) as total_enrollments,
      COALESCE(COUNT(CASE WHEN enrolled_at >= NOW() - INTERVAL '30 days' THEN 1 END), 0) as new_enrollments_30d,
      COALESCE(COUNT(CASE WHEN enrolled_at >= NOW() - INTERVAL '7 days' THEN 1 END), 0) as new_enrollments_7d,
      COALESCE(COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END), 0) as completed_enrollments,
      COALESCE(COUNT(CASE WHEN progress > 0 AND completed_at IS NULL THEN 1 END), 0) as active_enrollments,
      COALESCE(ROUND(AVG(progress), 2), 0) as average_progress,
      COALESCE(COUNT(DISTINCT course_id), 0) as courses_with_enrollments,
      COALESCE(COUNT(DISTINCT user_id), 0) as users_with_enrollments,
      COALESCE(ROUND(COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2), 0) as completion_rate
    FROM enrollments
  `;
  
  const coursePopularityQuery = `
    SELECT 
      c.title as course_title,
      COUNT(e.id) as enrollment_count,
      COALESCE(ROUND(AVG(e.progress), 2), 0) as avg_progress,
      COUNT(CASE WHEN e.completed_at IS NOT NULL THEN 1 END) as completions
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    GROUP BY c.id, c.title
    ORDER BY enrollment_count DESC
    LIMIT 10
  `;
  
  const monthlyTrendsQuery = `
    SELECT 
      DATE_TRUNC('month', enrolled_at) as month,
      COUNT(*) as enrollments,
      COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completions
    FROM enrollments
    WHERE enrolled_at >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', enrolled_at)
    ORDER BY month
  `;
  

  
  try {
    const [enrollmentData, coursePopularity, monthlyTrends] = await Promise.all([
      query(enrollmentDataQuery),
      query(coursePopularityQuery),
      query(monthlyTrendsQuery)
    ]);
    

    
    const result = {
      ...enrollmentData.rows[0],
      popular_courses: coursePopularity.rows,
      monthly_trends: monthlyTrends.rows
    };
    

    
    return result;
  } catch (error) {
    console.error('❌ [getDetailedEnrollmentData] Error:', error);
    throw error;
  }
};


const systemModel = {
  getSystemStatistics,
  testDatabaseConnection,
  getUserStatistics,
  getCourseStatistics,
  getEnrollmentStatistics,
  getUserGrowthData,
  getCourseGrowthData,
  getEnrollmentTrendsData,
  getCompletionRateData,
  getActiveUsersData,
  getDetailedUserData,
  getDetailedCourseData,
  getDetailedEnrollmentData,
  getSystemHealthData
};

export default systemModel;