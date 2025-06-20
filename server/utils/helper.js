import jwt from "jsonwebtoken";



export const createResponse = (success, message, data = null, error = null) => {
  return {
    success,
    message,
    data,
    error,
    timestamp: new Date().toISOString()
  };
};

export const generateAccessToken = (user) => {
  try {
    return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  } catch (error) {
    console.error('Access token generation failed:', error);
    throw new Error('Failed to generate access token');
  }
  
};

export const generateRefreshToken = (user) => {
  try {
     return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  } catch (error) {
    console.error('Refresh token generation failed:', error);
    throw new Error('Failed to generate refresh token');
  }
 
};