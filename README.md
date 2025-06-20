# LMS Server - Learning Management System API

A comprehensive Learning Management System backend built with Node.js, Express, and PostgreSQL.

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT, Passport.js (Google OAuth)
- **File Storage**: Cloudinary
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Joi
- **Password Hashing**: bcryptjs

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd .\server\
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the server root directory:
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/lms_db
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   SERVER_URL=http://localhost:5000
   CLIENT_URL=http://localhost:3000
   
   # JWT Secrets
   JWT_SECRET=your_jwt_secret_key_here
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
   
   # Session Secret
   SESSION_SECRET=your_session_secret_here
   
   # Password Hashing
   BCRYPT_SALT_ROUNDS=12
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   
   # Google OAuth (Optional)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=/auth/google/callback
   ```

4. **Set up the database**
   
   Create a PostgreSQL database:
   ```sql
   CREATE DATABASE lms_db;
   ```
   
   Run the schema file to create tables:
   ```bash
   psql -U username -d lms_db -f schema.sql
   ```

5. **Start the server**
   
   For development:
   ```bash
   npm run dev
   ```
   
