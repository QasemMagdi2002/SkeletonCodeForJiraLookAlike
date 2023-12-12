const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
const port = 3000;

const users = [];

// Serve static files from the public folder
app.use(express.static('public'));

// Body parsing middleware
app.use(express.urlencoded({ extended: false }));

// Define a route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

// Define a route for the sign-up page
app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/signup.html'));
});

// Define a route for the dashboard page
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/dashboard.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
