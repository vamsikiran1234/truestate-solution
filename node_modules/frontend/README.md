# Frontend - Retail Sales Management System

## Overview
React-based single-page application for viewing and managing retail sales data with advanced filtering, sorting, and pagination capabilities.

## Tech Stack
- React 18
- Vite
- Axios
- CSS3 with CSS Variables

## Project Structure
```
frontend/
├── public/
├── src/
│   ├── components/          # React UI components
│   │   ├── Header.jsx
│   │   ├── SearchBar.jsx
│   │   ├── FilterPanel.jsx
│   │   ├── MultiSelectFilter.jsx
│   │   ├── RangeFilter.jsx
│   │   ├── DateRangeFilter.jsx
│   │   ├── SortingDropdown.jsx
│   │   ├── TransactionTable.jsx
│   │   └── Pagination.jsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useSalesData.js
│   │   └── useFilters.js
│   ├── services/            # API communication
│   │   └── api.js
│   ├── utils/               # Helper functions
│   │   └── helpers.js
│   ├── styles/              # CSS stylesheets
│   │   ├── index.css
│   │   ├── App.css
│   │   └── [component].css
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Features
- Responsive design
- Real-time search with debouncing
- Multi-select filters
- Range-based filters (age, date)
- Multiple sorting options
- Paginated data display

## Setup
```bash
npm install
npm run dev
```

Runs on http://localhost:3000
