import express from "express";
import { CourseController } from "../controllers/course.controller.js";
import { authenticate, authorize, isCourseInstructorOrAdmin } from "../middleware/auth.js";
import { validateRequest, validateMultiple, schema, validateBooleanQuery } from "../middleware/validate.js";
import { uploadImage } from "../middleware/upload.js";

const router = express.Router();

// Public routes with validation
router.get("/public", 
  validateRequest(schema.publicCourseQuery, 'query'),
  CourseController.getPublicCourses
);

router.get("/:id", 
  validateRequest(schema.idParam, 'params'),
  CourseController.getCourse
);

// General course listing with validation
router.get("/", 
  validateRequest(schema.courseListQuery, 'query'),
  validateBooleanQuery(['is_published', 'is_approved']),
  CourseController.listCourses
);

// Protected routes - authentication required for all below
router.use(authenticate);

// Instructor/Admin routes
router.post("/", 
  authorize(["instructor", "admin"]),
  validateRequest(schema.createCourse),
  CourseController.createCourse
);

router.put("/:id", 
  authorize(["instructor", "admin"]),
  validateMultiple({
    params: schema.idParam,
    body: schema.updateCourse
  }),
  CourseController.updateCourse
);

router.delete("/:id", 
  authorize(["instructor", "admin"]),
  validateRequest(schema.idParam, 'params'),
  CourseController.deleteCourse
);

// Upload course thumbnail
router.post("/:id/upload-thumbnail",
  authorize(["instructor", "admin"]),
  isCourseInstructorOrAdmin,
  uploadImage.single("thumbnail"),
  CourseController.uploadThumbnail
);

router.put("/:id/publish", 
  authorize(["instructor", "admin"]),
  validateMultiple({
    params: schema.idParam,
    body: schema.publishCourse
  }),
  CourseController.publishCourse
);

// Instructor specific routes
router.get("/instructor/my-courses", 
  authorize(["instructor"]),
  validateRequest(schema.courseListQuery, 'query'),
  CourseController.getInstructorCourses
);

// Admin only routes
router.get("/admin/pending", 
  authorize(["admin"]),
  validateRequest(schema.pagination, 'query'),
  CourseController.getPendingCourses
);

router.put("/:id/approve", 
  authorize(["admin"]),
  validateMultiple({
    params: schema.idParam,
    body: schema.approveCourse
  }),
  CourseController.approveCourse
);

router.get("/admin/stats", 
  authorize(["admin"]),
  CourseController.getCourseStats
);

router.get("/admin/categories", 
  authorize(["admin"]),
  CourseController.getCoursesByCategory
);

router.get("/admin/top-performing", 
  authorize(["admin"]),
  CourseController.getTopPerformingCourses
);

router.get("/admin/trend", 
  authorize(["admin"]),
  CourseController.getCourseTrend
);


export default router;