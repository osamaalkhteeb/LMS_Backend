import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import systemController from "../controllers/system.controller.js";

const { getSystemStats, getSystemHealth, getReports, generateReport, downloadReport, getHistoricalAnalytics } = systemController;

const router = express.Router();

// Public health check endpoint
router.get('/health', getSystemHealth);

// Admin-only endpoints
router.use(authenticate, authorize(['admin']));

// Get system statistics
router.get('/stats', getSystemStats);

// Get available reports
router.get('/reports', getReports);

// Generate a new report
router.post('/reports/generate', generateReport);

// Download a report
router.get('/reports/download/:reportId', downloadReport);

// Get historical analytics data
router.get('/analytics/historical', getHistoricalAnalytics);

export default router;