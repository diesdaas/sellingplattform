// Minimal test server to isolate routing issues
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 5002;

app.use(cors());
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Minimal test works!', timestamp: new Date().toISOString() });
});

// Catalog test
app.get('/api/catalog', (req, res) => {
  res.json({ message: 'Catalog endpoint works!', module: 'catalog' });
});

app.listen(PORT, () => {
  console.log(`🚀 Minimal test server running on port ${PORT}`);
});
