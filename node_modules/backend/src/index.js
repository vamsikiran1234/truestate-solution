const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const salesRoutes = require('./routes/salesRoutes');
const { loadSalesData } = require('./services/dataService');

const app = express();
const PORT = process.env.PORT || 5000;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '500mb' })); // Increase JSON limit for large exports
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/sales', salesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
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
    await loadSalesData();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
