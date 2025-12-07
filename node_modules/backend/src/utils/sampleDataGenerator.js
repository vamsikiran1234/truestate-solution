/**
 * Sample data generator for testing when CSV is not available
 */

const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Robert', 'Lisa', 'William', 'Jessica', 'James', 'Amanda', 'Daniel', 'Jennifer', 'Christopher', 'Ashley', 'Matthew', 'Nicole', 'Andrew', 'Stephanie', 'Rajesh', 'Priya', 'Amit', 'Sunita', 'Vikram'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta'];
const regions = ['North', 'South', 'East', 'West', 'Central'];
const genders = ['Male', 'Female'];
const customerTypes = ['Regular', 'Premium', 'New', 'VIP'];
const categories = ['Electronics', 'Clothing', 'Home & Kitchen', 'Sports', 'Books', 'Beauty', 'Toys', 'Grocery'];
const brands = ['Samsung', 'Nike', 'Sony', 'Adidas', 'Apple', 'LG', 'Philips', 'Puma', 'Dell', 'HP', 'Lenovo', 'Boat'];
const productsByCategory = {
  'Electronics': ['Smartphone', 'Laptop', 'Tablet', 'Headphones', 'Smart Watch', 'Camera', 'Speaker'],
  'Clothing': ['T-Shirt', 'Jeans', 'Jacket', 'Dress', 'Shoes', 'Shorts', 'Sweater'],
  'Home & Kitchen': ['Blender', 'Toaster', 'Microwave', 'Cookware Set', 'Knife Set', 'Coffee Maker'],
  'Sports': ['Football', 'Cricket Bat', 'Tennis Racket', 'Yoga Mat', 'Dumbbells', 'Running Shoes'],
  'Books': ['Fiction Novel', 'Self-Help Book', 'Technical Manual', 'Biography', 'Cookbook'],
  'Beauty': ['Perfume', 'Face Cream', 'Lipstick', 'Shampoo', 'Sunscreen', 'Hair Oil'],
  'Toys': ['Action Figure', 'Board Game', 'Puzzle', 'Doll', 'Building Blocks', 'RC Car'],
  'Grocery': ['Rice', 'Flour', 'Cooking Oil', 'Sugar', 'Tea', 'Coffee', 'Snacks']
};
const tags = ['Bestseller', 'New Arrival', 'Sale', 'Premium', 'Eco-Friendly', 'Limited Edition', 'Trending', 'Budget'];
const paymentMethods = ['Credit Card', 'Debit Card', 'UPI', 'Cash', 'Net Banking', 'Wallet'];
const orderStatuses = ['Completed', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const deliveryTypes = ['Standard', 'Express', 'Same Day', 'Store Pickup'];
const storeLocations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'];

/**
 * Generate random number within range
 */
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Pick random element from array
 */
const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Pick multiple random elements from array
 */
const randomPickMultiple = (arr, count) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

/**
 * Generate random phone number
 */
const generatePhone = () => {
  return `+91${randomInt(7000000000, 9999999999)}`;
};

/**
 * Generate random date within last 2 years
 */
const generateDate = () => {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 2);
  
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime).toISOString().split('T')[0];
};

/**
 * Generate sample sales data
 */
const generateSampleData = (count = 500) => {
  const data = [];
  
  for (let i = 1; i <= count; i++) {
    const category = randomPick(categories);
    const products = productsByCategory[category];
    const quantity = randomInt(1, 10);
    const pricePerUnit = randomInt(100, 50000);
    const discountPercentage = randomInt(0, 30);
    const totalAmount = quantity * pricePerUnit;
    const discountAmount = (totalAmount * discountPercentage) / 100;
    const finalAmount = totalAmount - discountAmount;
    
    const record = {
      // Customer Fields
      customerId: `CUST${String(randomInt(1, 200)).padStart(4, '0')}`,
      customerName: `${randomPick(firstNames)} ${randomPick(lastNames)}`,
      phoneNumber: generatePhone(),
      gender: randomPick(genders),
      age: randomInt(18, 70),
      customerRegion: randomPick(regions),
      customerType: randomPick(customerTypes),
      
      // Product Fields
      productId: `PROD${String(randomInt(1, 500)).padStart(4, '0')}`,
      productName: randomPick(products),
      brand: randomPick(brands),
      productCategory: category,
      tags: randomPickMultiple(tags, randomInt(1, 3)).join(', '),
      
      // Sales Fields
      quantity,
      pricePerUnit,
      discountPercentage,
      totalAmount,
      finalAmount: Math.round(finalAmount * 100) / 100,
      
      // Operational Fields
      date: generateDate(),
      paymentMethod: randomPick(paymentMethods),
      orderStatus: randomPick(orderStatuses),
      deliveryType: randomPick(deliveryTypes),
      storeId: `STR${String(randomInt(1, 20)).padStart(3, '0')}`,
      storeLocation: randomPick(storeLocations),
      salespersonId: `EMP${String(randomInt(1, 50)).padStart(3, '0')}`,
      employeeName: `${randomPick(firstNames)} ${randomPick(lastNames)}`
    };
    
    data.push(record);
  }
  
  return data;
};

module.exports = {
  generateSampleData
};
