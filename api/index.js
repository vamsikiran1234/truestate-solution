// Vercel Serverless API handler - redirects to catch-all
module.exports = (req, res) => {
  res.setHeader('Location', '/api/health');
  res.status(307).end();
};
