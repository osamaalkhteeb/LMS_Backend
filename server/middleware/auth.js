import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { HTTP_STATUS } from "../config/constants.js";
import { createResponse } from "../utils/helper.js";
import CourseModel from "../models/course.model.js";

export const authenticate = async (req, res, next) => {
  // Check for token in Authorization header (access token)
  const authHeader = req.header("Authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  
  // Check for refresh token in cookies
  const refreshToken = req.cookies?.refreshToken;
  
  // No tokens provided
  if (!accessToken && !refreshToken) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: "Access denied. No token provided",
    });
  }
  
  try {
    let decoded;
    
    // Try to verify access token first
    if (accessToken) {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    } 
    // Fall back to refresh token if access token is not available or invalid
    else if (refreshToken) {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    }
    
    const { rows } = await pool.query(
      "SELECT id, email, role FROM users WHERE id = $1",
      [decoded.id]
    );

    if (!rows[0]) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: "Invalid token",
      });
    }
    req.user = rows[0];
    next();
  } catch (error) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

export const authorize = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: "Permission denied",
    });
  }
  next();
};

export const isCourseInstructorOrAdmin = async (req, res, next) => {
  try {
    const course = await CourseModel.getCourseById(req.params.courseId);

    if (req.user.role === "admin" || course?.instructor_id === req.user.id) {
      return next();
    }

    res
      .status(HTTP_STATUS.FORBIDDEN)
      .json(createResponse(false, "Not authorized to manage this course"));
  } catch (error) {
    res
      .status(HTTP_STATUS.SERVER_ERROR)
      .json(createResponse(false, "Error checking course authorization"));
  }
};
