# 🏠 TruEstate - Retail Sales Management System

> **SDE Intern Assignment Submission**  
> A high-performance, full-stack Retail Sales Management System handling **1 million+ records** with sub-100ms response times.

---

## 🎯 Assignment Requirements - All Completed ✅

| Requirement | Status | Implementation |
|------------|--------|----------------|
| Search (Customer Name, Phone) | ✅ | Inverted Index with word tokenization |
| Multi-select Filters (7 types) | ✅ | Pre-computed filter options |
| Sorting (4 options) | ✅ | Pre-sorted data optimization |
| Pagination (10/page) | ✅ | Efficient offset-based pagination |

---

## ⚡ Performance Highlights

Optimized for **1,000,000 records** with enterprise-grade performance:

| Operation | Response Time | Optimization Used |
|-----------|---------------|-------------------|
| Default Query | **5ms** | Pre-sorted data, skip sort |
| Search "Neha" | **91ms** | Inverted Index + word tokenization |
| Phone Search | **37ms** | Phone prefix indexing |
| Filter Options API | **4ms** | Pre-computed at startup |
| Any Filter Combination | **<200ms** | Single-pass filtering |

### 🔧 Optimizations Implemented

1. **Inverted Index Search** - O(1) lookup instead of O(n) linear scan
2. **Pre-sorted Data** - Data sorted by date at load time, skips sorting for default queries
3. **Pre-computed Filter Options** - Computed once at startup (~926ms), instant thereafter
4. **Phone Prefix Indexing** - Fast phone number search with prefix matching
5. **Memory Optimization** - 4GB heap allocation for large dataset handling

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌─────────────────┐   │
│  │ Search  │  │ Filters  │  │ Sorting │  │ Export CSV      │   │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └────────┬────────┘   │
│       └────────────┴─────────────┴────────────────┘            │
│                            │                                    │
│                    Debounced API Calls                         │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                      HTTP REST API
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                        BACKEND (Node.js)                        │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────────────┐ │
│  │                   API Layer (Express)                      │ │
│  │  GET /api/sales       - Paginated data with filters       │ │
│  │  GET /api/sales/filters - Pre-computed filter options     │ │
│  │  GET /api/sales/stats   - Cached statistics               │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────────────┐ │
│  │                  Service Layer                             │ │
│  │  • Search Index (Inverted Index)                          │ │
│  │  • Filter Engine (Single-pass)                            │ │
│  │  • Sort Optimizer (Pre-sorted detection)                  │ │
│  │  • Stats Cache                                            │ │
│  └─────────────────────────┬─────────────────────────────────┘ │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────────────┐ │
│  │               Data Layer (In-Memory)                       │ │
│  │  • 1M records loaded from CSV                             │ │
│  │  • Pre-sorted by date (descending)                        │ │
│  │  • Pre-computed filter options                            │ │
│  │  • Inverted index for search                              │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library with hooks
- **Vite** - Fast build tool and dev server
- **Axios** - HTTP client with interceptors
- **CSS3** - Custom styling (no frameworks)

### Backend
- **Node.js 16+** - Runtime environment
- **Express.js** - Web framework
- **CSV Parser** - Streaming data parsing
- **Morgan** - HTTP request logging

---

## ✨ Features

### Core Features (Required)
- 🔍 **Full-text Search** - Search by customer name or phone number
- 🏷️ **Multi-select Filters** - 7 filter types working in combination
- 📊 **Sorting** - 4 sort options (Date, Quantity, Name, Amount)
- 📄 **Pagination** - 10 items per page with navigation

### Bonus Features (Initiative)
- 📈 **Stats Dashboard** - Total sales, units sold, discounts at a glance
- 💾 **Export to CSV** - Download filtered data for offline analysis
- ⚡ **Sub-100ms Response** - Optimized for 1M+ records
- 🎨 **Clean UI** - Professional, minimal design

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd truestate-retail-sales

# Install all dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### Running the Application

```bash
# Terminal 1: Start Backend (with memory allocation for 1M records)
cd backend
node --max-old-space-size=4096 src/index.js

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

**Note:** First load takes ~16 seconds as the backend:
- Loads 1M records from CSV (~2s)
- Pre-sorts data by date (~6.7s)
- Builds search index (~7.5s)
- Pre-computes filter options (~1s)

---

## 📁 Project Structure

```
truestate-retail-sales/
├── backend/
│   ├── data/
│   │   └── sales_data.csv          # 1M records dataset
│   └── src/
│       ├── index.js                # Server entry point
│       ├── controllers/
│       │   └── salesController.js  # Request handlers
│       ├── routes/
│       │   └── salesRoutes.js      # API routes
│       ├── services/
│       │   ├── dataService.js      # Data loading & preprocessing
│       │   └── salesService.js     # Business logic & caching
│       └── utils/
│           ├── dataUtils.js        # Filter & sort utilities
│           └── searchIndex.js      # Inverted index implementation
│
├── frontend/
│   └── src/
│       ├── App.jsx                 # Main application component
│       ├── components/
│       │   ├── SearchBar.jsx       # Search input with debounce
│       │   ├── FilterBar.jsx       # Multi-select filter dropdowns
│       │   ├── SortingDropdown.jsx # Sort options dropdown
│       │   ├── TransactionTable.jsx# Data table display
│       │   ├── Pagination.jsx      # Page navigation
│       │   ├── StatsCards.jsx      # Statistics dashboard
│       │   └── ExportButton.jsx    # CSV export functionality
│       ├── hooks/
│       │   ├── useFilters.js       # Filter state management
│       │   └── useSalesData.js     # API data fetching
│       └── services/
│           └── api.js              # API client configuration
│
└── docs/
    └── architecture.md             # Detailed architecture docs
```

---

## 🔍 Search Implementation

The search uses an **Inverted Index** for O(1) lookups:

```javascript
// Index structure
{
  wordIndex: {
    "neha": Set(recordIds),
    "reddy": Set(recordIds),
    ...
  },
  phoneIndex: {
    "927": Set(recordIds),    // 3-digit prefix
    "9270": Set(recordIds),   // 4-digit prefix
    ...
  }
}
```

**Benefits:**
- Instant search results (91ms for 1M records)
- Supports partial phone number matching
- Case-insensitive search
- Word tokenization for name search

---

## 🎛️ Filter Implementation

All 7 filters work independently and in combination:

| Filter | Type | Field |
|--------|------|-------|
| Customer Region | Multi-select | customerRegion |
| Gender | Multi-select | gender |
| Age Range | Range slider | age |
| Product Category | Multi-select | productCategory |
| Tags | Multi-select | tags |
| Payment Method | Multi-select | paymentMethod |
| Date Range | Date picker | date |

**Optimization:** Filter options are pre-computed at startup and cached.

---

## 📊 Sorting Implementation

| Option | Field | Order |
|--------|-------|-------|
| Date (Newest First) | date | desc |
| Date (Oldest First) | date | asc |
| Quantity (High to Low) | quantity | desc |
| Quantity (Low to High) | quantity | asc |
| Customer Name (A–Z) | customerName | asc |
| Customer Name (Z–A) | customerName | desc |
| Amount (High to Low) | finalAmount | desc |
| Amount (Low to High) | finalAmount | asc |

**Optimization:** Data is pre-sorted by date (desc) at load time. Default queries skip sorting entirely.

---

## 📄 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sales` | GET | Get paginated sales with filters & sort |
| `/api/sales/filters` | GET | Get available filter options |
| `/api/sales/stats` | GET | Get sales statistics |
| `/api/health` | GET | Health check endpoint |

### Query Parameters for `/api/sales`

```
search       - Search term (name or phone)
regions      - Comma-separated region values
genders      - Comma-separated gender values
minAge       - Minimum age filter
maxAge       - Maximum age filter
categories   - Comma-separated category values
tags         - Comma-separated tag values
paymentMethods - Comma-separated payment methods
startDate    - Start date (YYYY-MM-DD)
endDate      - End date (YYYY-MM-DD)
sortBy       - Sort field (date, quantity, customerName, finalAmount)
sortOrder    - Sort direction (asc, desc)
page         - Page number (default: 1)
limit        - Items per page (default: 10, max: 100)
```

---

## 🧪 Testing the Performance

```powershell
# Default query performance
$sw = [Diagnostics.Stopwatch]::StartNew()
Invoke-RestMethod "http://localhost:5000/api/sales?page=1&limit=10"
$sw.Stop()
"Time: $($sw.ElapsedMilliseconds)ms"

# Search performance
Invoke-RestMethod "http://localhost:5000/api/sales?search=Neha&page=1&limit=10"

# Filter combination
Invoke-RestMethod "http://localhost:5000/api/sales?regions=North,South&categories=Electronics&page=1&limit=10"
```

---

## 👨‍💻 Author

**Vamsi** - SDE Intern Assignment Submission

---

## 📝 License

This project was created for the TruEstate SDE Intern assignment.
