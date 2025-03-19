import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, 'public', 'database', 'db.json');

// Ensure database file exists
async function ensureDb() {
  try {
    await fs.access(DB_PATH);
  } catch {
    const defaultDb = { files: [], keys: [], shares: [] };
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(defaultDb, null, 2));
  }
}

// Get database
app.get('/api/db', async (req, res) => {
  try {
    await ensureDb();
    const data = await fs.readFile(DB_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading database:', error);
    res.status(500).json({ error: 'Failed to read database' });
  }
});

// Save database
app.post('/api/db', async (req, res) => {
  try {
    await ensureDb();
    await fs.writeFile(DB_PATH, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving database:', error);
    res.status(500).json({ error: 'Failed to save database' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 