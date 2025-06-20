import { query } from "../config/db.js";

const CategoryModel = {
  // Create a new category ( Admin Only)
  async createCategory({ name }) {
    try {
        // Check if category already exists
    const existingCategory = await query(
      "SELECT id FROM categories WHERE LOWER(name) = LOWER($1)",
      [name.trim()]
    );
    
    if (existingCategory.rows.length > 0) {
      throw new Error('Category with this name already exists');
    }
    
      const { rows } = await query(
        "INSERT INTO categories (name) VALUES ($1) RETURNING *",
        [name.trim()]
      );
      return rows[0];
    } catch (error) {
      console.error("Error creating category:", error);
      throw error;
    }
  },

  // Get all categories
  async getAllCategories() {
    try {
      const { rows } = await query("SELECT * FROM categories ORDER BY name");
      return rows;
    } catch (error) {
      console.error("Error getting categories:", error);
      throw error;
    }
  },

  // Update category (Admin only)
  async updateCategory(id, name) {
    try {
      const { rows } = await query(
        "UPDATE categories SET name = $1 WHERE id = $2 RETURNING *",
        [name.trim(), id]
      );
      return rows[0];
    } catch (error) {
      console.error("Error updating category:", error);
      throw error;
    }
  },

  // Delete category
  async deleteCategory(id) {
    try {
      // Check if any courses use this category
      const { rows: course } = await query(
        "SELECT id FROM courses WHERE category_id = $1 LIMIT 1",
        [id]
      );
      if (course.length > 0) {
        throw new Error("Category is being used by courses");
      }

      const { rows } = await query(
        "DELETE FROM categories WHERE id = $1 RETURNING id",
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
  },

  // Get category by ID
  async getCategoryById(id) {
    try {
      const { rows } = await query("SELECT * FROM categories WHERE id = $1", [
        id,
      ]);
      return rows[0];
    } catch (error) {
      console.error("Error getting category:", error);
      throw error;
    }
  },
};

export default CategoryModel;