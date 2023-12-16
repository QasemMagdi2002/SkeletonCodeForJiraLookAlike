const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const session = require('express-session');
const port = 3000;

app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
  })
);


const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Environment1-',
  database: 'usersdb'
})

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});

const sql = "SELECT * FROM users";

db.query(sql, (err, results) => {
  if (err) throw err;
  console.log(results);
});

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
    db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [req.body.name, req.body.email, hashedPassword],
      (error, results) => {
        if (error) {
          console.error('Error registering user:', error);
          res.redirect('/signup.html'); // Redirect to the sign-up page in case of an error
        } else {
          console.log('User registered successfully');
          res.redirect('/login'); // Redirect to the login page
        }
      }
    );
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
// Define a route for user authentication
app.post('/login', async (req, res) => {
  try {    
    const { email, password } = req.body;
    // Fetch user data from the users table
    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
      if (error) {
        console.error('Error authenticating user:', error);
        res.status(500).send('Error authenticating user');
      } else {
        const user = results[0];
        console.log('User object:', user);

        if (user && (await bcrypt.compare(password, user.password))) {
          // Set user information in the session
          req.session.userId = user.ID;

          res.redirect('/dashboard.html'); // Redirect to the user's dashboard on successful login
        } else {
          res.redirect('/login'); // Redirect to the login page if password is incorrect or user not found
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});



// Define a route for the dashboard page
app.get('/dashboard.html', (req, res) => {
  const userId = req.session.userId;
  if (userId) {
    // Fetch user-specific data (tasks, preferences, etc.)
    // Render the user's dashboard with the fetched data
    res.sendFile(path.join(__dirname, '/public/dashboard.html'));
  } else {
    res.redirect('/login');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
