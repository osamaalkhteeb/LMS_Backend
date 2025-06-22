import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload an image to Cloudinary
 * @param {string} imagePath - The path, URL or base64 string of the image to upload
 * @param {Object} options - Additional options for the upload
 * @returns {Promise<Object>} - The upload result containing URLs and metadata
 */
export const uploadImage = async (imagePath, options = {}) => {
  try {
    // Set default folder if not specified in options
    const uploadOptions = {
      folder: 'lms_uploads',
      ...options
    };
    
    // Upload the image to Cloudinary
    const result = await cloudinary.uploader.upload(imagePath, uploadOptions);
    return result;
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload a document to Cloudinary
 * @param {string} documentPath - The path, URL or base64 string of the document to upload
 * @param {Object} options - Additional options for the upload
 * @returns {Promise<Object>} - The upload result containing URLs and metadata
 */
export const uploadDocument = async (documentData, filename, options = {}) => {
  try {
    // Set optimized default options for document uploads
    const uploadOptions = {
      folder: 'lms_lessons/documents',
      resource_type: 'raw', // Use 'raw' for non-image files
      chunk_size: 6000000, // 6MB chunks for better upload performance
      timeout: 60000, // 1 minute timeout for documents
      ...options
    };
    
    // If filename is provided, use it as the public_id (preserving extension for documents)
    if (filename) {
      uploadOptions.public_id = filename;
    }
    
    console.log('Uploading document to Cloudinary with options:', {
      folder: uploadOptions.folder,
      resource_type: uploadOptions.resource_type,
      filename: filename
    });
    
    let uploadData;
    
    // Handle different input types
    if (Buffer.isBuffer(documentData)) {
      // Convert Buffer to base64 data URL
      const mimeType = filename?.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
      uploadData = `data:${mimeType};base64,${documentData.toString('base64')}`;
    } else if (typeof documentData === 'string') {
      // Assume it's already a path or base64 string
      uploadData = documentData;
    } else {
      throw new Error('Invalid document data type. Expected Buffer or string.');
    }
    
    // Upload the document to Cloudinary
    const result = await cloudinary.uploader.upload(uploadData, uploadOptions);
    
    console.log('Document upload successful:', {
      public_id: result.public_id,
      bytes: result.bytes,
      format: result.format
    });
    
    return result;
  } catch (error) {
    console.error('Error uploading document to Cloudinary:', error);
    console.error('Upload options used:', {
      folder: options.folder || 'lms_lessons/documents',
      resource_type: options.resource_type || 'raw',
      filename: filename
    });
    throw error;
  }
};

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - The public ID of the image to delete
 * @returns {Promise<Object>} - The deletion result
 */
export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload a video to Cloudinary
 * @param {string|Buffer} videoData - The path, URL, base64 string, or Buffer of the video to upload
 * @param {string} filename - The original filename (used when videoData is a Buffer)
 * @param {Object} options - Additional options for the upload
 * @returns {Promise<Object>} - The upload result containing URLs and metadata
 */
export const uploadVideo = async (videoData, filename = null, options = {}) => {
  try {
    // Set optimized default options for video uploads (Free tier compatible)
    const uploadOptions = {
      folder: 'lms_lessons/videos',
      resource_type: 'video',
      quality: 'auto:low', // Lower quality for free tier
      format: 'mp4',
      chunk_size: 6000000, // 6MB chunks for better upload performance
      timeout: 120000, // 2 minutes timeout
      ...options
    };
    
    // If filename is provided, use it as the public_id (without extension)
    if (filename) {
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
      uploadOptions.public_id = nameWithoutExt;
    }
    
    console.log('Uploading video to Cloudinary with options:', {
      folder: uploadOptions.folder,
      quality: uploadOptions.quality,
      format: uploadOptions.format
    });
    
    // Handle Buffer data by converting to data URI
    let uploadData = videoData;
    if (Buffer.isBuffer(videoData)) {
      const base64Data = videoData.toString('base64');
      uploadData = `data:video/mp4;base64,${base64Data}`;
    }
    
    // Upload the video to Cloudinary
    const result = await cloudinary.uploader.upload(uploadData, uploadOptions);
    
    console.log('Video upload successful:', {
      public_id: result.public_id,
      duration: result.duration,
      bytes: result.bytes,
      format: result.format
    });
    
    return result;
  } catch (error) {
    console.error('Error uploading video to Cloudinary:', error);
    console.error('Upload options used:', options);
    throw error;
  }
};

/**
 * Delete a document from Cloudinary
 * @param {string} publicId - The public ID of the document to delete
 * @returns {Promise<Object>} - The deletion result
 */
export const deleteDocument = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw'
    });
    return result;
  } catch (error) {
    console.error('Error deleting document from Cloudinary:', error);
    throw error;
  }
};

/**
 * Delete a video from Cloudinary
 * @param {string} publicId - The public ID of the video to delete
 * @returns {Promise<Object>} - The deletion result
 */
export const deleteVideo = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'video'
    });
    return result;
  } catch (error) {
    console.error('Error deleting video from Cloudinary:', error);
    throw error;
  }
};

/**
 * Delete any resource from Cloudinary based on URL
 * @param {string} url - The Cloudinary URL to extract public ID from
 * @param {string} resourceType - The type of resource ('image', 'video', 'raw')
 * @returns {Promise<Object>} - The deletion result
 */
export const deleteByUrl = async (url, resourceType = 'image') => {
  try {
    // Extract public ID from Cloudinary URL
    const urlParts = url.split('/');
    const fileWithExtension = urlParts[urlParts.length - 1];
    const publicId = fileWithExtension.split('.')[0];
    const folder = urlParts.slice(-2, -1)[0];
    const fullPublicId = `${folder}/${publicId}`;
    
    const result = await cloudinary.uploader.destroy(fullPublicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Error deleting resource from Cloudinary:', error);
    throw error;
  }
};

export default cloudinary;