import { HTTP_STATUS } from "../config/constants.js";

export const errorHandler = (err, req, res, next) => {
  console.error(err.stack); //Log for debugging

  const status = err.status || HTTP_STATUS.SERVER_ERROR;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  res.status(status).json({
    success: false,
    error: message,
    details: process.env.NODE_ENV === "development" ? err.stack : null,
  });
};
