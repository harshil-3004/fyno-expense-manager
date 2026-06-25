const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// Security
app.use(helmet());
app.use(cors());

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Fyno API is running 🚀' });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;
