# Smart Reconciliation & Audit System

A full-stack MERN application for reconciling transaction data against system records with audit trail functionality.

## Features

- **File Upload**: Support for CSV and Excel files
- **Reconciliation Engine**: Exact match, partial match (±2% tolerance), and duplicate detection
- **Dashboard**: Real-time statistics and job tracking
- **Audit Trail**: Track all changes and operations
- **Role-based Access**: Admin, Analyst, Viewer roles

## Tech Stack

- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT tokens

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Git

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
# .env file
PORT=5000
MONGODB_URI=mongodb://localhost:27017/reconciliation_app
JWT_SECRET=your-secret-key
```

4. Start MongoDB service

5. Run the backend:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the frontend:
```bash
npm run dev
```

## Usage

1. **Load System Records**: Upload baseline transaction data via the System Records page
2. **Upload Files**: Upload transaction files for reconciliation
3. **View Results**: Check dashboard for reconciliation statistics
4. **Audit Trail**: Track all operations and changes

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Upload & Reconciliation
- `POST /api/upload` - Upload and process files
- `GET /api/upload/results/:jobId` - Get reconciliation results
- `POST /api/system-records/load-system-records` - Load baseline data

### Dashboard
- `GET /api/dashboard/upload-jobs` - Get upload job history
- `GET /api/dashboard/stats` - Get system statistics

## Project Structure

```
backend/
├── src/
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── utils/           # Business logic
│   ├── config/          # Configuration
│   └── app.js           # Express app

frontend/
├── src/
│   ├── components/      # React components
│   ├── api.js           # API client
│   └── App.jsx          # Main app
```

## Development Phases

### Phase 1: Foundation (Completed)
- Database models and schemas
- File upload with preview
- Basic reconciliation logic
- System records loading

### Phase 2: Dashboard & Analytics (Current)
- Dashboard with statistics
- Upload job tracking
- Results visualization

### Phase 3: Advanced Features
- Audit trail system
- Manual correction interface
- Performance optimization

### Phase 4: Polish & Documentation
- Error handling
- Testing
- Documentation

## Sample Data

Create sample CSV files with these columns:
- transactionId
- amount
- referenceNumber
- date

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License