# Backend - Retail Sales Management System

## Overview
Express.js REST API server providing endpoints for sales data with search, filtering, sorting, and pagination capabilities.

## Tech Stack
- Node.js
- Express.js
- CSV Parser

## API Endpoints

### GET /api/sales
Fetches sales data with optional query parameters.

**Query Parameters:**
- `search` - Search term for Customer Name or Phone Number
- `regions` - Comma-separated list of regions
- `genders` - Comma-separated list of genders
- `minAge`, `maxAge` - Age range filter
- `categories` - Comma-separated product categories
- `tags` - Comma-separated tags
- `paymentMethods` - Comma-separated payment methods
- `startDate`, `endDate` - Date range filter
- `sortBy` - Sort field (date, quantity, customerName)
- `sortOrder` - Sort direction (asc, desc)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

### GET /api/sales/filters
Returns available filter options from the dataset.

## Setup
```bash
npm install
npm run dev
```

Server runs on port 5000 by default.
