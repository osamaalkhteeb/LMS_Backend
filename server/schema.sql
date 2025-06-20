-- USERS
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT,
    role VARCHAR(20) CHECK (role IN ('student', 'instructor', 'admin')),
    oauth_provider VARCHAR(20) UNIQUE,
    oauth_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE ,
    last_login_at TIMESTAMP WITH TIME ZONE,
    bio TEXT,
    avatar_url TEXT,
    image_public_id TEXT
);

-- COURSES
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    instructor_id INTEGER REFERENCES users(id),
    category_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    thumbnail_url TEXT,
    image_public_id TEXT,
	is_featured BOOLEAN DEFAULT false,
	is_published BOOLEAN DEFAULT false,
	is_approved BOOLEAN DEFAULT false;
);

-- CATEGORIES
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- ENROLLMENTS
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    course_id INTEGER REFERENCES courses(id),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    progress INTEGER CHECK (progress >= 0 AND progress <= 100)
);

-- MODULES
CREATE TABLE modules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id),
    title VARCHAR(150),
    description TEXT,
    order_num INTEGER
);

-- LESSONS
CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES modules(id),
    title VARCHAR(150),
    content_type VARCHAR(20) CHECK (content_type IN ('video', 'quiz', 'text', 'assignment')),
    content_url TEXT,
    duration INTEGER,
    order_num INTEGER,
    cloudinary_public_id TEXT
);

-- ASSIGNMENTS
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER UNIQUE REFERENCES lessons(id),
    title VARCHAR(150),
    description TEXT,
    deadline TIMESTAMP WITH TIME ZONE
);

-- SUBMISSIONS
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER REFERENCES assignments(id) NOT NULL,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    submission_url TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    grade INTEGER CHECK (grade >= 0 AND grade <= 100),
    feedback TEXT,
    graded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(assignment_id, user_id)
);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lesson_completions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    lesson_id INTEGER REFERENCES lessons(id),
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, lesson_id) -- one completion per lesson per user
);

-- Quizzes (revised)
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER REFERENCES lessons(id),
    title VARCHAR(150),
    passing_score INTEGER DEFAULT 50,
    time_limit INTEGER, -- in minutes, NULL means no time limit
    max_attempts INTEGER DEFAULT 1
);

-- QUIZ_QUESTIONS
CREATE TABLE quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
    points INTEGER DEFAULT 1,
    order_num INTEGER
);

-- QUIZ_OPTIONS (for multiple choice questions)
CREATE TABLE quiz_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    order_num INTEGER
);

-- QUIZ_RESULTS (revised)
CREATE TABLE quiz_results (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    score INTEGER CHECK (score BETWEEN 0 AND 100),
    attempt_number INTEGER DEFAULT 1,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (user_id, quiz_id, attempt_number) -- Allow multiple attempts per quiz
);

-- QUIZ_ANSWERS
CREATE TABLE quiz_answers (
    id SERIAL PRIMARY KEY,
    result_id INTEGER REFERENCES quiz_results(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES quiz_questions(id) ON DELETE CASCADE,
    answer_text TEXT, -- For short answers
    option_id INTEGER REFERENCES quiz_options(id) ON DELETE SET NULL, -- For multiple choice
    is_correct BOOLEAN -- For quick reference
);


CREATE TABLE analytics_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL UNIQUE,
    total_users INTEGER DEFAULT 0,
    total_courses INTEGER DEFAULT 0,
    total_enrollments INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Index for user email lookups
CREATE INDEX idx_users_email ON users(email);

-- Index for user role-based filtering
CREATE INDEX idx_users_role ON users(role);

-- Indexes for foreign keys
CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);

CREATE INDEX idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX idx_courses_category_id ON courses(category_id);

CREATE INDEX idx_modules_course_id ON modules(course_id);

CREATE INDEX idx_lessons_module_id ON lessons(module_id);
CREATE INDEX idx_assignments_lesson_id ON assignments(lesson_id);

CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_user_id ON submissions(user_id);

CREATE INDEX idx_quizzes_lesson_id ON quizzes(lesson_id);
CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_order_num ON quiz_questions(quiz_id, order_num);
CREATE INDEX idx_quiz_options_question_id ON quiz_options(question_id);
CREATE INDEX idx_quiz_options_is_correct ON quiz_options(question_id, is_correct);
CREATE INDEX idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX idx_quiz_results_quiz_id ON quiz_results(quiz_id);
CREATE INDEX idx_quiz_results_started_at ON quiz_results(started_at);
CREATE INDEX idx_quiz_answers_result_id ON quiz_answers(result_id);
CREATE INDEX idx_quiz_answers_question_id ON quiz_answers(question_id);
CREATE INDEX idx_quiz_answers_option_id ON quiz_answers(option_id);

-- Enrollments: if the student is enrolled in this course or not
CREATE INDEX idx_enrollments_user_course 
ON enrollments(user_id, course_id);

-- Courses: Get all Web Dev courses by an instructor
CREATE INDEX idx_courses_instructor_category 
ON courses(instructor_id, category_id);

-- Lessons: All quiz lessons in a specific module
CREATE INDEX idx_lessons_module_type 
ON lessons(module_id, content_type);

-- Submissions: Check if student submitted a specific assignment
CREATE INDEX idx_submissions_assignment_user 
ON submissions(assignment_id, user_id);


CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at);
CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_at ON enrollments(enrolled_at);
CREATE INDEX IF NOT EXISTS idx_enrollments_completed_at ON enrollments(completed_at);





CREATE INDEX idx_analytics_snapshots_date ON analytics_snapshots(snapshot_date);


-- Only run if you have data with NULL timestamps
UPDATE users 
SET created_at = CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '365 days')
WHERE created_at IS NULL;

UPDATE courses 
SET created_at = CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '180 days')
WHERE created_at IS NULL;

UPDATE enrollments 
SET enrolled_at = CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '90 days')
WHERE enrolled_at IS NULL;
