# Digiverify

**Role-Based Digital Verification System API**

Digiverify is a full-stack web application designed for role-based digital document upload and verification. It features a secure backend API built with Node.js and Express, and a responsive frontend built with React.

## Project Structure

The project is divided into two main directories:
- `backend/`: Node.js Express API.
- `frontend/`: React application.

## Tech Stack

### Backend
- **Node.js & Express**: API framework.
- **PostgreSQL**: Relational database (using `pg`).
- **Express Session & connect-pg-simple**: Session management.
- **Bcrypt**: Password hashing.
- **Multer**: Handling file uploads.

### Frontend
- **React**: UI library.
- **React Router**: Client-side routing.
- **Axios**: HTTP client for API requests.

## Setup Instructions

### Prerequisites
- Node.js
- PostgreSQL

### Database Setup
1. Ensure your PostgreSQL server is running.
2. Create a database for the project.
3. Configure the database connection in `backend/.env`.

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `backend/.env`. You will need to specify DB credentials, session secret, and port.
4. Start the backend server:
   ```bash
   npm run dev
   ```
   The backend will typically run on `http://localhost:5000`.

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm start
   ```
   The frontend will typically run on `http://localhost:3000`.

## Features
- Role-based access control
- Secure authentication and session management
- Document upload and verification
- Environment variable configuration

## License
ISC
