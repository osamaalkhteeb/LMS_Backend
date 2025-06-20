import Joi from "joi";
import { HTTP_STATUS } from "../config/constants.js";
import { createResponse } from "../utils/helper.js";

export const validateRequest =
  (schema, source = "body") =>
  (req, res, next) => {
    const dataToValidate =
      source === "params"
        ? req.params
        : source === "query"
        ? req.query
        : req.body;


    
    // Add context for file upload validation
    const validationOptions = {
      abortEarly: false,
      stripUnknown: true, // Remove unknown fields for security
      context: {
        hasFile: !!req.file // Pass file upload status as context
      }
    };
    
    const { error, value } = schema.validate(dataToValidate, validationOptions);

    if (error) {
      console.log("Validation Error Details:");
      console.log("Data being validated:", JSON.stringify(dataToValidate, null, 2));
      console.log("Validation errors:", error.details);

      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(createResponse(false, "Validation failed", null, errors));
    }
    

    
    // Apply validated and transformed values back to request
    if (source === "params") {
      req.params = value;
    } else if (source === "query") {
      // req.query is read-only, so we need to update individual properties
      Object.keys(value).forEach(key => {
        req.query[key] = value[key];
      });
    } else {
      req.body = value;
    }
    

    next();
  };

// Enhanced validation for multiple sources
export const validateMultiple = (schemas) => (req, res, next) => {
  const errors = [];

  Object.keys(schemas).forEach((source) => {
    const dataToValidate =
      source === "params"
        ? req.params
        : source === "query"
        ? req.query
        : req.body;

    const { error } = schemas[source].validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      error.details.forEach((detail) => {
        errors.push({
          source,
          field: detail.path.join("."),
          message: detail.message,
        });
      });
    }
  });

  if (errors.length > 0) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(createResponse(false, "Validation failed", null, errors));
  }
  next();
};

export const schema = {
  //Auth schemas
  register: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).+$/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      }),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  createUser: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).+$/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      }),
    role: Joi.string().valid("student", "instructor", "admin", "STUDENT", "INSTRUCTOR", "ADMIN").default("student").custom((value, helpers) => {
      return value.toLowerCase();
    }),
  }),

  //User profile schemas
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    bio: Joi.string().max(500).optional().allow(""),
    avatar_url: Joi.string().uri().optional().allow(""),
  }),

  updateUserByAdmin: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    role: Joi.string().valid("student", "instructor", "admin", "STUDENT", "INSTRUCTOR", "ADMIN").required().custom((value, helpers) => {
      return value.toLowerCase();
    }),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).+$/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      }),
  }),

  // Course schemas
  createCourse: Joi.object({
    title: Joi.string().min(3).max(150).required(),
    description: Joi.string().min(3).max(1000).required(),
    category_id: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().pattern(/^\d+$/).custom((value) => parseInt(value, 10))
    ).required(),
    thumbnail_url: Joi.string().optional().allow(""),
    thumbnail_image: Joi.string().optional().allow(""),
  }),

  updateCourse: Joi.object({
    title: Joi.string().min(5).max(150).optional(),
    description: Joi.string().max(1000).optional(),
    category_id: Joi.number().integer().positive().optional(),
    thumbnail_url: Joi.string().uri().optional().allow(""),
    is_approved: Joi.boolean().optional(),
    is_published: Joi.boolean().optional(),
  }).min(1),

  // NEW: Course-specific validation schemas
  courseId: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  publishCourse: Joi.object({
    is_published: Joi.boolean().required(),
  }),

  approveCourse: Joi.object({
    is_approved: Joi.boolean().required(),
  }),

  // NEW: Query parameter validation for course listing
  courseListQuery: Joi.object({
    category_id: Joi.number().integer().positive().optional(),
    instructor_id: Joi.number().integer().positive().optional(),
    is_published: Joi.string().valid("true", "false").optional(),
    is_approved: Joi.string().valid("true", "false").optional(),
    search: Joi.string().min(1).max(100).optional(),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    offset: Joi.number().integer().min(0).optional().default(0),
    page: Joi.number().integer().min(1).optional(),
  }),

  publicCourseQuery: Joi.object({
    category_id: Joi.number().integer().positive().optional(),
    search: Joi.string().min(1).max(100).optional(),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    offset: Joi.number().integer().min(0).optional().default(0),
    page: Joi.number().integer().min(1).optional(),
  }),

  // Module schemas
  createModule: Joi.object({
    title: Joi.string().min(3).max(150).required(),
    description: Joi.string().max(500).optional().allow(""),
    orderNum: Joi.number().integer().min(1).required(),
  }),

  updateModule: Joi.object({
    title: Joi.string().min(3).max(150).optional(),
    description: Joi.string().max(500).optional().allow(""),
    orderNum: Joi.number().integer().min(1).optional(),
  }).min(1),

  // Lesson schemas
  createLesson: Joi.object({
    title: Joi.string().min(3).max(150).required(),
    contentType: Joi.string().valid("video", "quiz", "text", "assignment").required(),
    contentUrl: Joi.string().uri().when("contentType", {
      is: Joi.string().valid("video", "text"),
      then: Joi.when(Joi.ref("$hasFile"), {
        is: true,
        then: Joi.optional().allow(""),
        otherwise: Joi.required()
      }),
      otherwise: Joi.optional().allow(""),
    }),
    duration: Joi.number().integer().min(0).optional(),
    orderNum: Joi.number().integer().min(1).required(),
  }),

  updateLesson: Joi.object({
    title: Joi.string().min(3).max(150).optional(),
    contentType: Joi.string().valid("video", "quiz", "text", "assignment").optional(),
    contentUrl: Joi.string().uri().optional(),
    duration: Joi.number().integer().min(1).optional(),
    orderNum: Joi.number().integer().min(1).optional(),
  }).min(1),

  // Quiz schemas
  // Enhanced Quiz schemas with better validation
  createQuiz: Joi.object({
    title: Joi.string().min(3).max(150).required(),
    passing_score: Joi.number().integer().min(0).max(100).default(50),
    time_limit: Joi.number().integer().min(1).optional(),
    max_attempts: Joi.number().integer().min(1).optional(),
    questions: Joi.array()
      .items(
        Joi.object({
          question_text: Joi.string().min(10).required(),
          question_type: Joi.string()
            .valid("multiple_choice", "true_false", "short_answer")
            .required(),
          points: Joi.number().integer().min(1).default(1),
          options: Joi.array()
            .items(
              Joi.object({
                option_text: Joi.string().required(),
                is_correct: Joi.boolean().required(),
              })
            )
            .when("question_type", {
              is: "multiple_choice",
              then: Joi.array().min(2).required(),
              otherwise: Joi.when("question_type", {
                is: "true_false",
                then: Joi.array().length(2).required(),
                otherwise: Joi.optional(),
              }),
            }),
        })
      )
      .min(1)
      .optional(),
  }),

  updateQuiz: Joi.object({
    id: Joi.number().integer().optional(),
    title: Joi.string().min(3).max(150).optional(),
    passing_score: Joi.number().integer().min(0).max(100).optional(),
    time_limit: Joi.number().integer().min(1).allow(null).optional(),
    max_attempts: Joi.number().integer().min(1).optional(),
    lesson_title: Joi.string().optional(),
    course_title: Joi.string().optional(),
    attemptInfo: Joi.object().optional(),
    questions: Joi.array()
      .items(
        Joi.object({
          id: Joi.number().integer().optional(),
          question_text: Joi.string().min(10).required(),
          question_type: Joi.string()
            .valid("multiple_choice", "true_false", "short_answer")
            .required(),
          points: Joi.number().integer().min(1).default(1),
          orderNum: Joi.number().integer().min(1).optional(),
          options: Joi.array()
            .items(
              Joi.object({
                id: Joi.number().integer().optional(),
                option_text: Joi.string().required(),
                is_correct: Joi.boolean().required(),
                order_num: Joi.number().integer().optional(),
              })
            )
            .when("question_type", {
              is: "multiple_choice",
              then: Joi.array().min(2).required(),
              otherwise: Joi.when("question_type", {
                is: "true_false",
                then: Joi.array().length(2).required(),
                otherwise: Joi.optional(),
              }),
            }),
        })
      )
      .optional(),
  }).min(1),

  // Quiz parameter validation
  quizId: Joi.object({
    quizId: Joi.number().integer().positive().required()
  }),

  // Assignment schemas
  createAssignment: Joi.object({
    title: Joi.string().min(5).max(150).required(),
    description: Joi.string().min(10).required(),
    deadline: Joi.date().greater("now").required(),
  }),

  updateAssignment: Joi.object({
    title: Joi.string().min(5).max(150).optional(),
    description: Joi.string().min(10).optional(),
    deadline: Joi.date().greater("now").optional(),
  }).min(1),

  // Submission schemas
  submitAssignment: Joi.object({
    submissionUrl: Joi.string().uri().optional().allow(''),
    content: Joi.string().optional().allow(''),
  }).unknown(true).custom((value, helpers) => {
    const { submissionUrl, content } = value;
    
    const hasUrl = submissionUrl && typeof submissionUrl === 'string' && submissionUrl.trim() !== '';
    const hasContent = content && typeof content === 'string' && content.trim() !== '';
    
    if (!hasUrl && !hasContent) {
      // Allow validation to pass - file will be checked in controller
      return value;
    }
    
    return value;
  }),

  gradeSubmission: Joi.object({
    grade: Joi.number().integer().min(0).max(100).required(),
    feedback: Joi.string().optional().allow(""),
  }),
  // NEW: Common parameter validation schemas
  idParam: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  // NEW: Pagination schema
  pagination: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    offset: Joi.number().integer().min(0).optional(),
  }),
  // Enrollment schemas
  enroll: Joi.object({
    course_id: Joi.number().integer().positive().required(),
  }),

  enrollmentId: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  // For unenroll route parameters
  unenrollParams: Joi.object({
    userId: Joi.number().integer().positive().required(),
    courseId: Joi.number().integer().positive().required(),
  }),

  // For getByCourse route parameters
  courseIdParam: Joi.object({
    courseId: Joi.number().integer().positive().required(),
  }),
};

// Custom validation functions for specific use cases
export const validateCourseOwnership = (req, res, next) => {
  // This should be used after authentication
  if (!req.user) {
    return res
      .status(HTTP_STATUS.UNAUTHORIZED)
      .json(createResponse(false, "Authentication required"));
  }
  next();
};

// Validate that boolean query parameters are properly formatted
export const validateBooleanQuery = (fields) => (req, res, next) => {
  const errors = [];

  fields.forEach((field) => {
    if (req.query[field] !== undefined) {
      if (!["true", "false"].includes(req.query[field])) {
        errors.push({
          field,
          message: `${field} must be either 'true' or 'false'`,
        });
      }
    }
  });

  if (errors.length > 0) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(createResponse(false, "Invalid query parameters", null, errors));
  }
  next();
};
