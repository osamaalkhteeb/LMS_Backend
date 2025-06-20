import CategoryModel from "../models/category.model.js";
import { createResponse } from "../utils/helper.js";
import { HTTP_STATUS } from "../config/constants.js";

export const CategoryController = {
  // Create category (Admin)
  async createCategory(req, res) {
    try {
      const { name } = req.body;
      if (!name) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "Name is required"));
      }

      const category = await CategoryModel.createCategory({name});

      res
        .status(HTTP_STATUS.CREATED)
        .json(createResponse(true, "Category created successfully", category));
    } catch (error) {
      console.error("Error creating category:", error);
      if (error.message === 'Category with this name already exists' || 
        error.code === '23505') { // 23505 is PostgreSQL unique constraint violation
      return res
        .status(409) // Conflict status
        .json(createResponse(false, "Category with this name already exists"));
    }
      res
        .status(HTTP_STATUS.SERVER_ERROR)
        .json(createResponse(false, "Failed to create category"));
    }
  },

  // List all categories
  async listCategories(req, res) {
    try {
      const categories = await CategoryModel.getAllCategories();

      res
        .status(HTTP_STATUS.OK)
        .json(
          createResponse(true, "Categories retrieved successfully", categories)
        );
    } catch (error) {
      console.error("List categories error:", error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(createResponse(false, "Failed to list categories"));
    }
  },

  // update category (Admin)
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(createResponse(false, "Name is required"));
      }

      const updatedCategory = await CategoryModel.updateCategory(id, name);
      if (!updatedCategory) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "Category not found"));
      }
      res
        .status(HTTP_STATUS.OK)
        .json(
          createResponse(true, "Category updated successfully", updatedCategory)
        );
    } catch (error) {
      console.error("Update category error:", error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(createResponse(false, "Failed to update category"));
    }
  },

  //Delete category (Admin)
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const deletedCategory = await CategoryModel.deleteCategory(id);

      if (!deletedCategory) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "Category not found"));
      }
      res
        .status(HTTP_STATUS.OK)
        .json(
          createResponse(true, "Category deleted successfully", deletedCategory)
        );
    } catch (error) {
      console.error("Delete category error:", error);
      const status = error.message.includes("in use")
        ? HTTP_STATUS.CONFLICT
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      res
        .status(status)
        .json(
          createResponse(false, error.message || "Failed to delete category")
        );
    }
  },

  // Get category by ID
  async getCategoryById(req, res) {
    try {
      const { id } = req.params;
      const category = await CategoryModel.getCategoryById(id);

      if (!category) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(createResponse(false, "Category not found"));
      }
      res
        .status(HTTP_STATUS.OK)
        .json(
          createResponse(true, "Category retrieved successfully", category)
        );
    } catch (error) {
      console.error("Get category by ID error:", error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(createResponse(false, "Failed to get category"));
    }
  },
};
