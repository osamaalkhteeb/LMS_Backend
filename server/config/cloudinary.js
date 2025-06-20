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
export const uploadDocument = async (documentPath, options = {}) => {
  try {
    // Set default folder and resource type for documents
    const uploadOptions = {
      folder: 'lms_assignments',
      resource_type: 'raw', // Use 'raw' for non-image files
      ...options
    };
    
    // Upload the document to Cloudinary
    const result = await cloudinary.uploader.upload(documentPath, uploadOptions);
    return result;
  } catch (error) {
    console.error('Error uploading document to Cloudinary:', error);
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
 * @param {string} videoPath - The path, URL or base64 string of the video to upload
 * @param {Object} options - Additional options for the upload
 * @returns {Promise<Object>} - The upload result containing URLs and metadata
 */
export const uploadVideo = async (videoPath, options = {}) => {
  try {
    // Set default folder and resource type for videos
    const uploadOptions = {
      folder: 'lms_lessons/videos',
      resource_type: 'video',
      ...options
    };
    
    // Upload the video to Cloudinary
    const result = await cloudinary.uploader.upload(videoPath, uploadOptions);
    return result;
  } catch (error) {
    console.error('Error uploading video to Cloudinary:', error);
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