
const express = require('express');
const { Client } = require('pg');
const path = require('path');

// Initialize Express app
const app = express();
app.use(express.json()); // Middleware to parse JSON bodies
console.log(process.env.DATABASE_URL)
// PostgreSQL client setup
const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:zanyraccoon881@localhost:5432/acme_icecream_db',
  });
  

client.connect()
  .then(() => {
    console.log('Connected to PostgreSQL');
    initDb(); // Call the function to initialize the database
  })
  .catch(err => {
    console.error('Failed to connect to PostgreSQL', err);
  });

// Function to initialize the database
const initDb = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS flavors (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      is_favorite BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const seedDataQuery = `
    INSERT INTO flavors (name, is_favorite)
    VALUES 
      ('Vanilla', true),
      ('Chocolate', false),
      ('Strawberry', false)
    ON CONFLICT DO NOTHING;
  `;

  try {
    await client.query(createTableQuery);
    await client.query(seedDataQuery);
    console.log('Database initialized and flavors seeded.');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

// API Routes

// GET /api/flavors - Returns an array of flavors
app.get('/api/flavors', async (req, res, next) => {
  try {
    const result = await client.query('SELECT * FROM flavors');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/flavors/:id - Returns a single flavor by ID
app.get('/api/flavors/:id', async (req, res, next) => {
    const { id } = req.params;
  
    // Ensure id is an integer
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
  
    try {
      const result = await client.query('SELECT * FROM flavors WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Flavor not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  });
// POST /api/flavors - Creates a new flavor
app.post('/api/flavors', async (req, res, next) => {
  const { name, is_favorite } = req.body;
  try {
    const result = await client.query(
      'INSERT INTO flavors (name, is_favorite) VALUES ($1, $2) RETURNING *',
      [name, is_favorite]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/flavors/:id - Updates an existing flavor
app.put('/api/flavors/:id', async (req, res, next) => {
  const { name, is_favorite } = req.body;
  try {
    const result = await client.query(
      'UPDATE flavors SET name = $1, is_favorite = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [name, is_favorite, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Flavor not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/flavors/:id - Deletes a flavor by ID
app.delete('/api/flavors/:id', async (req, res, next) => {
  try {
    const result = await client.query('DELETE FROM flavors WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Flavor not found' });
    }
    res.status(204).end(); // No content to return
  } catch (err) {
    next(err);
  }
});

// Static files and serving the front end
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
