import rateLimit from "express-rate-limit";
import { createResponse } from "../utils/helper.js";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, //15min
  max: 100, //max req per IP
  message: createResponse(
    false,
    "Too many requests",
    null,
    "Rate limit exceeded"
  ),
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: createResponse( false, "Too many attempts, please try again later"),
  standardHeaders: true,
  legacyHeaders: false,
});
