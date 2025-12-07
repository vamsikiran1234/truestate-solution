# Architecture Document

## System Overview
The Retail Sales Management System follows a client-server architecture with clear separation between frontend and backend responsibilities. The system is designed for scalability, maintainability, and ease of development.

```
┌─────────────────┐     HTTP/REST    ┌─────────────────┐
│                 │ ◄──────────────► │                 │
│   React App     │                  │  Express API    │
│   (Frontend)    │                  │   (Backend)     │
│                 │                  │                 │
└─────────────────┘                  └─────────────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │   Data Layer    │
                                     │   (CSV/Memory)  │
                                     └─────────────────┘
```

## Backend Architecture

### Overview
The backend is built with Node.js and Express.js, following a layered architecture pattern that separates concerns across different modules.

### Architecture Layers

```
┌────────────────────────────────────────────────────┐
│                   Routes Layer                      │
│            (API endpoint definitions)               │
└────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────┐
│               Controllers Layer                     │
│       (Request handling, validation, response)      │
└────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────┐
│                Services Layer                       │
│         (Business logic, data processing)           │
└────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────┐
│                 Utils Layer                         │
│      (Helper functions, data transformations)       │
└────────────────────────────────────────────────────┘
```

### Module Responsibilities

#### `index.js` (Entry Point)
- Express application setup
- Middleware configuration (CORS, Morgan, JSON parsing)
- Route mounting
- Error handling middleware
- Server initialization

#### `routes/salesRoutes.js`
- Defines API endpoints for sales operations
- Maps HTTP methods to controller functions
- Endpoints:
  - `GET /api/sales` - Fetch sales with filters
  - `GET /api/sales/filters` - Get filter options
  - `GET /api/sales/stats` - Get sales statistics

#### `controllers/salesController.js`
- Handles HTTP request/response cycle
- Parses and validates query parameters
- Calls appropriate service methods
- Formats and returns responses
- Error handling for each endpoint

#### `services/salesService.js`
- Contains business logic for sales operations
- Applies search, filters, sorting, pagination
- Extracts filter options from data
- Calculates statistics

#### `services/dataService.js`
- Manages data loading and storage
- Loads CSV data on startup
- Normalizes record fields
- Generates sample data if CSV unavailable

#### `utils/dataUtils.js`
- Pure utility functions for data operations
- `applySearch()` - Case-insensitive search
- `applyFilters()` - Multi-filter application
- `applySorting()` - Field-based sorting
- `applyPagination()` - Data slicing for pagination
- `extractUniqueValues()` - Get unique filter values

#### `utils/sampleDataGenerator.js`
- Generates realistic sample data for testing
- Creates diverse customer, product, and sales records
- Used when CSV file is not available

### API Design

#### Request Flow
```
Client Request
     │
     ▼
┌─────────────┐
│   Router    │ ──► Route matching
└─────────────┘
     │
     ▼
┌─────────────┐
│ Controller  │ ──► Parse params, validate
└─────────────┘
     │
     ▼
┌─────────────┐
│  Service    │ ──► Apply business logic
└─────────────┘
     │
     ▼
┌─────────────┐
│   Utils     │ ──► Data transformations
└─────────────┘
     │
     ▼
Response to Client
```

#### Response Format
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## Frontend Architecture

### Overview
The frontend is a React single-page application built with Vite, following component-based architecture with custom hooks for state management.

### Architecture Layers

```
┌────────────────────────────────────────────────────┐
│                 Components Layer                    │
│            (UI rendering, user interaction)         │
└────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────┐
│                  Hooks Layer                        │
│          (State management, side effects)           │
└────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────┐
│                Services Layer                       │
│            (API communication, HTTP)                │
└────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────┐
│                  Utils Layer                        │
│        (Helper functions, formatters)               │
└────────────────────────────────────────────────────┘
```

### Module Responsibilities

#### Components

| Component | Responsibility |
|-----------|----------------|
| `App.jsx` | Main application container, orchestrates all child components |
| `Header.jsx` | Application header with branding |
| `SearchBar.jsx` | Text input for searching by name/phone |
| `FilterPanel.jsx` | Container for all filter controls |
| `MultiSelectFilter.jsx` | Dropdown with multiple selection |
| `RangeFilter.jsx` | Numeric range input (min/max) |
| `DateRangeFilter.jsx` | Date range picker |
| `SortingDropdown.jsx` | Dropdown for sort field/order selection |
| `TransactionTable.jsx` | Data table with responsive design |
| `Pagination.jsx` | Page navigation controls |

#### Hooks

| Hook | Responsibility |
|------|----------------|
| `useSalesData.js` | Manages data fetching, loading states, error handling |
| `useFilters.js` | Manages filter, sorting, and pagination state |

#### Services

| Service | Responsibility |
|---------|----------------|
| `api.js` | Axios instance configuration, API endpoint methods |

#### Utils

| Utility | Responsibility |
|---------|----------------|
| `helpers.js` | Debounce, currency/date formatting, query string helpers |

### State Management

```
┌─────────────────────────────────────────────┐
│                  App.jsx                     │
│  ┌─────────────────────────────────────┐    │
│  │         useFilters Hook              │    │
│  │  - filters (search, regions, etc.)   │    │
│  │  - sorting (sortBy, sortOrder)       │    │
│  │  - pagination (page, limit)          │    │
│  └─────────────────────────────────────┘    │
│                    │                         │
│                    ▼                         │
│  ┌─────────────────────────────────────┐    │
│  │        useSalesData Hook             │    │
│  │  - data (sales records)              │    │
│  │  - loading, error states             │    │
│  │  - totalItems, totalPages            │    │
│  └─────────────────────────────────────┘    │
│                    │                         │
│         ┌─────────┴─────────┐               │
│         ▼                   ▼               │
│  ┌─────────────┐    ┌─────────────┐        │
│  │ FilterPanel │    │ DataTable   │        │
│  └─────────────┘    └─────────────┘        │
└─────────────────────────────────────────────┘
```

### Component Tree

```
App
├── Header
├── SearchBar
├── FilterPanel
│   ├── MultiSelectFilter (regions)
│   ├── MultiSelectFilter (genders)
│   ├── MultiSelectFilter (categories)
│   ├── MultiSelectFilter (tags)
│   ├── MultiSelectFilter (paymentMethods)
│   ├── RangeFilter (age)
│   └── DateRangeFilter
├── SortingDropdown
├── TransactionTable
└── Pagination
```

---

## Data Flow

### Search Flow
```
User Types in SearchBar
         │
         ▼
   Debounce (300ms)
         │
         ▼
  updateSearch() called
         │
         ▼
   filters.search updated
         │
         ▼
   useEffect triggers refetch()
         │
         ▼
   API call with search param
         │
         ▼
  Backend applySearch()
         │
         ▼
  Filtered data returned
         │
         ▼
  Table re-renders
```

### Filter Flow
```
User Selects Filter Value
         │
         ▼
  onFilterChange() callback
         │
         ▼
  updateFilter() in useFilters
         │
         ▼
  Specific filter state updated
         │
         ▼
  Page reset to 1
         │
         ▼
  useEffect triggers refetch()
         │
         ▼
  API call with filter params
         │
         ▼
  Backend applyFilters()
         │
         ▼
  Filtered data returned
```

### Pagination Flow
```
User Clicks Page Number
         │
         ▼
  onPageChange() callback
         │
         ▼
  updatePage() in useFilters
         │
         ▼
  pagination.page updated
         │
         ▼
  useEffect triggers refetch()
         │
         ▼
  API call with page param
         │
         ▼
  Backend applyPagination()
         │
         ▼
  Paginated data returned
         │
         ▼
  Table and Pagination re-render
```

---

## Folder Structure

```
📁 root/
├── 📁 backend/
│   ├── 📁 data/                 # CSV data files
│   ├── 📁 src/
│   │   ├── 📁 controllers/      # Request handlers
│   │   │   └── salesController.js
│   │   ├── 📁 routes/           # API routes
│   │   │   └── salesRoutes.js
│   │   ├── 📁 services/         # Business logic
│   │   │   ├── dataService.js
│   │   │   └── salesService.js
│   │   ├── 📁 utils/            # Helper functions
│   │   │   ├── dataUtils.js
│   │   │   └── sampleDataGenerator.js
│   │   └── index.js             # Entry point
│   ├── package.json
│   └── README.md
│
├── 📁 frontend/
│   ├── 📁 public/               # Static assets
│   ├── 📁 src/
│   │   ├── 📁 components/       # React components
│   │   ├── 📁 hooks/            # Custom hooks
│   │   ├── 📁 services/         # API services
│   │   ├── 📁 utils/            # Utility functions
│   │   ├── 📁 styles/           # CSS files
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
├── 📁 docs/
│   └── architecture.md          # This document
│
├── package.json                 # Root package.json
└── README.md                    # Main README
```

---

## Edge Case Handling

### No Search Results
- Frontend displays empty state message
- Backend returns empty array with totalItems: 0

### Conflicting Filters
- All filters are applied using AND logic
- If no data matches, empty result is returned
- User can clear filters to reset

### Invalid Numeric Ranges
- Frontend validates min < max before applying
- Backend handles null values gracefully
- Invalid ranges are ignored in filtering

### Large Filter Combinations
- Backend processes filters sequentially in memory
- Performance optimized by early exit on empty results
- Consider database indexing for production

### Missing Optional Fields
- All fields have default values in normalization
- Display shows '-' for missing values
- Filters handle empty/null values correctly

---

## Security Considerations

- Input sanitization on all query parameters
- No SQL injection risk (in-memory data)
- CORS configured for frontend origin
- Error messages don't expose internal details

---

## Performance Optimizations

- Debounced search input (300ms)
- Pagination reduces data transfer
- Sequential filter application (early exit)
- React memo can be added for component optimization
- CSS uses hardware-accelerated properties
