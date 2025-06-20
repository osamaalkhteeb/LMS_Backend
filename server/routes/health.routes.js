import express from "express";
import { createResponse } from "../utils/helper.js";

const router = express.Router();

// Health check route
router.get('/', (req, res) => {
  res.json(createResponse(true, 'Server is running', {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }));
});

export default router;