import { HTTP_STATUS } from "../config/constants.js";
import ModuleModel from "../models/module.model.js";
import { createResponse } from "../utils/helper.js";  

export const ModuleController = {
  async create(req, res) {
    try {
      const module = await ModuleModel.createModule({
        courseId: req.params.courseId,
        title: req.body.title,
        description: req.body.description,
        orderNum: req.body.orderNum
      });
      res.status(HTTP_STATUS.CREATED).json(
        createResponse(true, "Module created", module)
      );
    } catch (error) {
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to create module")
      );
    }
  },

  async getByCourse(req, res) {
    try {
      const modules = await ModuleModel.getModulesByCourseId(req.params.courseId);
      
      res.json(createResponse(true, "Modules retrieved", modules));
    } catch (error) {
      console.error('❌ Error in ModuleController.getByCourse:', error);
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to fetch modules")
      );
    }
  },
  
  async getById(req, res) {
    try {
      const module = await ModuleModel.getById(req.params.moduleId);
      if (!module) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "Module not found")
        );
      }
      res.json(createResponse(true, "Module retrieved", module));
    } catch (error) {
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to fetch module")
      );
    }
  },
  
  async update(req, res) {
    try {
      const moduleId = req.params.moduleId;
      const updatedModule = await ModuleModel.update(moduleId, {
        title: req.body.title,
        description: req.body.description,
        orderNum: req.body.orderNum || req.body.order_num
      });
      if (!updatedModule) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "Module not found")
        );
      }
      
      res.json(createResponse(true, "Module updated", updatedModule));
    } catch (error) {
      console.error('Error updating module:', error);
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to update module")
      );
    }
  },
  
  async delete(req, res) {
    try {
      const deleted = await ModuleModel.delete(req.params.moduleId);
      
      if (!deleted) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, "Module not found")
        );
      }
      
      res.json(createResponse(true, "Module deleted successfully"));
    } catch (error) {
      res.status(HTTP_STATUS.SERVER_ERROR).json(
        createResponse(false, "Failed to delete module")
      );
    }
  }
};
