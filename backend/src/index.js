require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const salesRoutes = require('./routes/salesRoutes');
const { loadSalesData } = require('./services/dataService');
const { initSupabase, isUsingDatabase } = require('./services/databaseService');

const app = express();
const PORT = process.env.PORT || 5000;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    /\.vercel\.app$/  // Allow all Vercel subdomains
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/sales', salesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dataSource = isUsingDatabase() ? 'Supabase PostgreSQL' : 'CSV file';
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    dataSource 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Initialize data and start server
const startServer = async () => {
  try {
    // Initialize Supabase if credentials are available
    await initSupabase();
    
    // Load CSV data only if not using database
    if (!isUsingDatabase()) {
      await loadSalesData();
    }
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Data source: ${isUsingDatabase() ? 'Supabase PostgreSQL' : 'CSV file'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
