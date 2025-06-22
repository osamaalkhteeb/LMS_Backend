import multer from 'multer';
import path from 'path';
import { createResponse } from '../utils/helper.js';
import { HTTP_STATUS, SUPPORTED_FILE_TYPES } from '../config/constants.js';

// Configure storage for temporary file uploads
const storage = multer.memoryStorage();

// File filter for images (profiles and course thumbnails)
const imageFileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed!'), false);
  }
};

// File filter for Word documents (assignments)
const documentFileFilter = (req, file, cb) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  const isDocument = SUPPORTED_FILE_TYPES.DOCUMENT.mimeTypes.includes(file.mimetype) &&
                    SUPPORTED_FILE_TYPES.DOCUMENT.extensions.includes(fileExtension);
  
  if (isDocument) {
    cb(null, true);
  } else {
    cb(new Error(`Only document files are allowed! ${SUPPORTED_FILE_TYPES.DOCUMENT.description}`), false);
  }
};

// File filter for lesson content (videos and documents)
const lessonContentFilter = (req, file, cb) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  // Check if it's a video file
  const isVideo = SUPPORTED_FILE_TYPES.VIDEO.mimeTypes.includes(file.mimetype) && 
                  SUPPORTED_FILE_TYPES.VIDEO.extensions.includes(fileExtension);
  
  // Check if it's a document file
  const isDocument = SUPPORTED_FILE_TYPES.DOCUMENT.mimeTypes.includes(file.mimetype) && 
                     SUPPORTED_FILE_TYPES.DOCUMENT.extensions.includes(fileExtension);
  
  if (isVideo || isDocument) {
    cb(null, true);
  } else {
    const videoTypes = SUPPORTED_FILE_TYPES.VIDEO.description;
    const documentTypes = SUPPORTED_FILE_TYPES.DOCUMENT.description;
    cb(new Error(`Only supported file types are allowed! ${videoTypes} or ${documentTypes}`), false);
  }
};

// Configure multer for image uploads
const uploadImage = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// Configure multer for document uploads
const uploadDocument = multer({
  storage: storage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size for documents
  },
});

// Configure multer for lesson content uploads
const uploadLessonContent = multer({
  storage: storage,
  fileFilter: lessonContentFilter,
  limits: {
    fileSize: Math.max(SUPPORTED_FILE_TYPES.VIDEO.maxSize, SUPPORTED_FILE_TYPES.DOCUMENT.maxSize), // Use the larger of the two limits
  },
});

// Multer error handling middleware
export const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, `File size too large.`, null, {
          type: 'FILE_SIZE_ERROR',
          details: `File size exceeds the limit. ${SUPPORTED_FILE_TYPES.VIDEO.description} or ${SUPPORTED_FILE_TYPES.DOCUMENT.description}`,
          videoLimit: SUPPORTED_FILE_TYPES.VIDEO.description,
          documentLimit: SUPPORTED_FILE_TYPES.DOCUMENT.description
        })
      );
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Too many files uploaded.', null, {
          type: 'FILE_COUNT_ERROR',
          details: error.message
        })
      );
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, 'Unexpected file field.', null, {
          type: 'UNEXPECTED_FILE_ERROR',
          details: error.message
        })
      );
    }
    // Handle other multer errors
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, 'File upload error.', null, {
        type: 'UPLOAD_ERROR',
        details: error.message
      })
    );
  }
  
  // If it's not a multer error, pass it to the next error handler
  next(error);
};

// Export all configurations
export { uploadImage, uploadDocument, uploadLessonContent };
export default uploadImage; // Keep default export for backward compatibility