import { query } from "../config/db.js";

const UserModel = {
  // find user by email
  async findUserByEmail(email) {
    try {
      const { rows } = await query(
        "SELECT id, name, email, role, password_hash, oauth_provider, oauth_id, is_active, avatar_url, image_public_id FROM users WHERE email = $1",
        [email]
      );
      return rows[0];
    } catch (error) {
      console.error("Error finding user by Email:", error);
      throw error;
    }
  },
  
  // find user by id
  async findUserById(id) {
    try {
      const { rows } = await query(
        "SELECT id, name, email, role, bio, avatar_url, image_public_id, is_active, created_at FROM users WHERE id = $1",
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error("Error finding user by ID:", error);
      throw error;
    }
  },
  
  // find user by OAuth
  async findUserByOAuthId(oauthId) {
    try {
      const { rows } = await query(
        "SELECT id, name, email, role, oauth_provider, oauth_id, avatar_url, image_public_id FROM users WHERE oauth_id = $1",
        [oauthId]
      );
      return rows[0];
    } catch (error) {
      console.error("Error finding user by OAuth Id:", error);
      throw error;
    }
  },

  // create new user
  async createUser({ name, email, hashedPassword, role = "student" }) {
    try {
      const { rows } = await query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
        [name, email, hashedPassword, role]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  },
  
  // create OAuth user
  async createOAuthUser({ name, email, oauth_provider, oauth_id, avatar_url, role = "student" }) {
    try {
      const { rows } = await query(
        "INSERT INTO users (name, email, avatar_url, oauth_provider, oauth_id, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, avatar_url",
        [name, email, avatar_url, oauth_provider, oauth_id, role]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  //update last login
  async updateLastLogin(id) {
    try {
      await query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [id]);
    } catch (error) {
      throw error;
    }
  },

  // get all users (admin)
  async getAllUsers(limit = 20, offset = 0) {
    try {
      const { rows } = await query(
        "SELECT id, name, email, role, is_active, created_at, last_login_at, avatar_url FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        [limit, offset]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  },

  //get users by role
  async getUserByRole(role) {
    try {
      const { rows } = await query(
        "SELECT id, name, email, role, is_active FROM users WHERE role = $1",
        [role]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  },
  
  // Update user
  async updateUser(id, { name, bio, avatar_url, image_public_id }) {
    try {
      // If image_public_id is provided, update it along with other fields
      if (image_public_id) {
        const { rows } = await query(
          "UPDATE users SET name = $1, bio = $2, avatar_url = $3, image_public_id = $4, updated_at = NOW() WHERE id = $5 RETURNING id, name, email, role, bio, avatar_url, image_public_id",
          [name, bio, avatar_url, image_public_id, id]
        );
        return rows[0];
      } else {
        // Otherwise just update the regular fields
        const { rows } = await query(
          "UPDATE users SET name = $1, bio = $2, avatar_url = $3, updated_at = NOW() WHERE id = $4 RETURNING id, name, email, role, bio, avatar_url, image_public_id",
          [name, bio, avatar_url, id]
        );
        return rows[0];
      }
    } catch (error) {
      throw error;
    }
  },

  // Update user by admin (includes role)
  async updateUserByAdmin(id, { name, email, role }) {
    try {
      const { rows } = await query(
        "UPDATE users SET name = $1, email = $2, role = $3, updated_at = NOW() WHERE id = $4 RETURNING id, name, email, role, bio, avatar_url, is_active, created_at, updated_at",
        [name, email, role, id]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  //toggle user active status (admin)
  async toggleUserStatus(id) {
    try {
      const { rows } = await query(
        "UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, is_active",
        [id]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Delete user (admin only)
  async deleteUser(id) {
    try {
      const { rows } = await query(
        "DELETE FROM users WHERE id = $1 RETURNING id",
        [id]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Check if email exists
  async emailExists(email) {
    try {
      const { rows } = await query("SELECT id FROM users WHERE email = $1", [
        email,
      ]);
      return rows.length > 0;
    } catch (error) {
      throw error;
    }
  },

  // Get user stats (for admin dashboard)
  async getUserStats() {
    try {
      const { rows } = await query(`
        SELECT 
          COUNT(*) as total_users, 
          COUNT(CASE WHEN role = 'student' THEN 1 END) as students, 
          COUNT(CASE WHEN role = 'instructor' THEN 1 END) as instructors, 
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins, 
          COUNT(CASE WHEN is_active IS NOT FALSE THEN 1 END) as active_users, 
          COUNT(CASE WHEN last_login_at IS NOT NULL THEN 1 END) as recent_logins 
        FROM users
      `);

      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Update password
  async updatePassword(id, hashedPassword) {
    try {
      const { rows } = await query(
        "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id",
        [hashedPassword, id]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Get user trend data for the last 6 months
  async getUserTrend() {
    try {
      const { rows } = await query(`
        WITH months AS (
          SELECT 
            TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + INTERVAL '1 month' * generate_series(0, 5)), 'Mon') as month_name,
            DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + INTERVAL '1 month' * generate_series(0, 5)) as month_date
        ),
        user_counts AS (
          SELECT 
            DATE_TRUNC('month', created_at) as month_date,
            COUNT(*) as users_created
          FROM users 
          WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
          GROUP BY DATE_TRUNC('month', created_at)
        ),
        cumulative_counts AS (
          SELECT 
            m.month_name,
            m.month_date,
            COALESCE(uc.users_created, 0) as users_created,
            (
              SELECT COUNT(*) 
              FROM users 
              WHERE created_at <= m.month_date + INTERVAL '1 month' - INTERVAL '1 second'
            ) as total_users
          FROM months m
          LEFT JOIN user_counts uc ON m.month_date = uc.month_date
        )
        SELECT 
          array_agg(month_name ORDER BY month_date) as labels,
          array_agg(total_users ORDER BY month_date) as data
        FROM cumulative_counts
      `);
      
      return {
        labels: rows[0]?.labels || [],
        data: rows[0]?.data || []
      };
    } catch (error) {
      throw error;
    }
  }
};

export default UserModel;