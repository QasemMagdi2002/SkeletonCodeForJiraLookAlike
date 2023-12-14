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

// Define a route for user registration
app.post('/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    users.push({
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
    });
    console.log(users); // Display newly registered user in the console
    res.redirect('/login'); // Redirect to the login page
  } catch (error) {
    console.error(error);
    res.redirect('/signup.html'); // Redirect to the sign-up page in case of an error
  }
});

// Define a route for the login page (adjust the route based on your naming convention)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

// Define a route for user authentication
app.post('/login', async (req, res) => {
  const user = users.find((u) => u.email === req.body.email);
  if (user) {
    try {
      if (await bcrypt.compare(req.body.password, user.password)) {
        res.redirect('/dashboard.html'); // Redirect to the dashboard on successful login
      } else {
        res.redirect('/login'); // Redirect to the login page if password is incorrect
      }
    } catch (error) {
      console.error(error);
      res.redirect('/login'); // Redirect to the login page in case of an error
    }
  } else {
    res.redirect('/login'); // Redirect to the login page if user not found
  }
});

// Define a route for the dashboard page
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, '/public/dashboard.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
