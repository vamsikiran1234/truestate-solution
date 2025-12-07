const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { generateSampleData } = require('../utils/sampleDataGenerator');
const { buildSearchIndex } = require('../utils/dataUtils');

let salesData = [];

// Pre-computed filter options cache
let filterOptionsPrecomputed = null;

/**
 * Pre-compute filter options during data load
 */
const precomputeFilterOptions = (data) => {
  console.time('Pre-compute filter options');
  
  const regions = new Set();
  const genders = new Set();
  const categories = new Set();
  const tagsSet = new Set();
  const paymentMethods = new Set();
  let minAge = Infinity, maxAge = -Infinity;
  let minDate = Infinity, maxDate = -Infinity;
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    
    if (item.customerRegion) regions.add(item.customerRegion);
    if (item.gender) genders.add(item.gender);
    if (item.productCategory) categories.add(item.productCategory);
    if (item.paymentMethod) paymentMethods.add(item.paymentMethod);
    
    if (item.tags) {
      const tagList = item.tags.split(',').map(t => t.trim());
      tagList.forEach(tag => { if (tag) tagsSet.add(tag); });
    }
    
    if (item.age > 0) {
      if (item.age < minAge) minAge = item.age;
      if (item.age > maxAge) maxAge = item.age;
    }
    
    if (item.date) {
      const date = new Date(item.date);
      const time = date.getTime();
      if (!isNaN(time)) {
        if (time < minDate) minDate = time;
        if (time > maxDate) maxDate = time;
      }
    }
  }
  
  filterOptionsPrecomputed = {
    regions: Array.from(regions).sort(),
    genders: Array.from(genders).sort(),
    categories: Array.from(categories).sort(),
    tags: Array.from(tagsSet).sort(),
    paymentMethods: Array.from(paymentMethods).sort(),
    ageRange: { min: minAge === Infinity ? 0 : minAge, max: maxAge === -Infinity ? 100 : maxAge },
    dateRange: {
      min: minDate === Infinity ? new Date().toISOString().split('T')[0] : new Date(minDate).toISOString().split('T')[0],
      max: maxDate === -Infinity ? new Date().toISOString().split('T')[0] : new Date(maxDate).toISOString().split('T')[0]
    }
  };
  
  console.timeEnd('Pre-compute filter options');
};

/**
 * Get pre-computed filter options
 */
const getPrecomputedFilterOptions = () => {
  return filterOptionsPrecomputed;
};

/**
 * Load sales data from CSV file or generate sample data
 */
const loadSalesData = () => {
  return new Promise((resolve, reject) => {
    const csvPath = path.join(__dirname, '../../data/sales_data.csv');
    
    // Check if CSV file exists
    if (fs.existsSync(csvPath)) {
      const results = [];
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (data) => {
          results.push(normalizeRecord(data));
        })
        .on('end', () => {
          salesData = results;
          console.log(`Loaded ${salesData.length} records from CSV`);
          
          // Pre-compute filter options (do this first, before sorting)
          precomputeFilterOptions(salesData);
          
          // Pre-sort by date (descending) - this is the default sort
          console.time('Pre-sort by date');
          salesData.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB.getTime() - dateA.getTime(); // Descending
          });
          console.timeEnd('Pre-sort by date');
          
          // Build search index for faster search
          buildSearchIndex(salesData);
          resolve(salesData);
        })
        .on('error', (error) => {
          console.error('Error reading CSV:', error);
          reject(error);
        });
    } else {
      // Generate sample data if CSV doesn't exist
      console.log('CSV file not found, generating sample data...');
      salesData = generateSampleData(500);
      console.log(`Generated ${salesData.length} sample records`);
      // Build search index for faster search
      buildSearchIndex(salesData);
      resolve(salesData);
    }
  });
};

/**
 * Normalize a record from CSV
 */
const normalizeRecord = (record) => {
  return {
    // Customer Fields
    customerId: record['Customer ID'] || record.customerId || '',
    customerName: record['Customer Name'] || record.customerName || '',
    phoneNumber: record['Phone Number'] || record.phoneNumber || '',
    gender: record['Gender'] || record.gender || '',
    age: parseInt(record['Age'] || record.age, 10) || 0,
    customerRegion: record['Customer Region'] || record.customerRegion || '',
    customerType: record['Customer Type'] || record.customerType || '',
    
    // Product Fields
    productId: record['Product ID'] || record.productId || '',
    productName: record['Product Name'] || record.productName || '',
    brand: record['Brand'] || record.brand || '',
    productCategory: record['Product Category'] || record.productCategory || '',
    tags: record['Tags'] || record.tags || '',
    
    // Sales Fields
    quantity: parseInt(record['Quantity'] || record.quantity, 10) || 0,
    pricePerUnit: parseFloat(record['Price per Unit'] || record.pricePerUnit) || 0,
    discountPercentage: parseFloat(record['Discount Percentage'] || record.discountPercentage) || 0,
    totalAmount: parseFloat(record['Total Amount'] || record.totalAmount) || 0,
    finalAmount: parseFloat(record['Final Amount'] || record.finalAmount) || 0,
    
    // Operational Fields
    date: record['Date'] || record.date || '',
    paymentMethod: record['Payment Method'] || record.paymentMethod || '',
    orderStatus: record['Order Status'] || record.orderStatus || '',
    deliveryType: record['Delivery Type'] || record.deliveryType || '',
    storeId: record['Store ID'] || record.storeId || '',
    storeLocation: record['Store Location'] || record.storeLocation || '',
    salespersonId: record['Salesperson ID'] || record.salespersonId || '',
    employeeName: record['Employee Name'] || record.employeeName || ''
  };
};

/**
 * Get all sales data
 */
const getSalesData = () => {
  return salesData;
};

/**
 * Set sales data (for testing or direct loading)
 */
const setSalesData = (data) => {
  salesData = data.map(normalizeRecord);
};

module.exports = {
  loadSalesData,
  getSalesData,
  setSalesData,
  normalizeRecord,
  getPrecomputedFilterOptions
};
