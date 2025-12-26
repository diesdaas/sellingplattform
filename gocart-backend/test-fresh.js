// Completely fresh test - no shared imports
import express from 'express';
import cors from 'cors';

console.log('Starting fresh test server...');

const app = express();
const PORT = 5003;

app.use(cors());
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Fresh test works!', timestamp: new Date().toISOString() });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', server: 'fresh-test' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Fresh test server running on port ${PORT}`);
  console.log(`   Test route: http://localhost:${PORT}/api/test`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});
