const express = require('express');
const app = express();
const path = require('path');
const port = 3000;

// Serve static files from the public folder
app.use(express.static('public'));

// Define a route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

// Define a route for the about page
app.get('/about.html', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/about.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
