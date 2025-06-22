import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import session from "express-session";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { globalLimiter } from "./config/rateLimit.js";
import sessionConfig from "./config/session.js";
import passport from "./config/passport.js";
import { errorHandler } from "./middleware/error.js";


import "./config/db.js";
import { createResponse } from "./utils/helper.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import courseRoutes from "./routes/course.routes.js"
import categoryRoutes from "./routes/category.routes.js"
import enrollmentRoutes from "./routes/enrollment.routes.js"
import lessonCompletionRoutes from "./routes/lessonCompletion.routes.js"
import quizRoutes from "./routes/quiz.routes.js"
import moduleRoutes from "./routes/module.routes.js";
import lessonRoutes from "./routes/lesson.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js"
import healthRoutes from "./routes/health.routes.js"
import debugRoutes from "./routes/debug.routes.js"
import systemRoutes from "./routes/system.routes.js"



dotenv.config();

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development, configure for production
  crossOriginEmbedderPolicy: false
}));


// app.use(globalLimiter);

app.use(
  cors({
    origin: process.env.CLIENT_URL, // The frontend domain allowed to access your API
    credentials: true, // Allows cookies and sessions to be sent
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add this temporary debug middleware
app.use((req, res, next) => {
  console.log('=== Request Debug ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Raw Body exists:', !!req.rawBody);
  console.log('====================');
  next();
});
app.use(cookieParser());

// Initialize session
app.use(session(sessionConfig));

// Initialize passport and session
app.use(passport.initialize());
app.use(passport.session());

// Performance monitoring


// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/lesson-completions", lessonCompletionRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/health", healthRoutes);
app.use("/api/debug", debugRoutes);
app.use("/api/system", systemRoutes);

app.use(errorHandler);


export default app;