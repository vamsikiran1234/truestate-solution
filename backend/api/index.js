// Vercel Serverless API handler - root endpoint
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  res.status(200).json({
    status: 'OK',
    message: 'TrueState API is running',
    endpoints: ['/api/health', '/api/sales', '/api/sales/stats', '/api/sales/filter-options', '/api/sales/export']
  });
};
