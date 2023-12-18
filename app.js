const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const session = require('express-session');

const port = 3000;

app.use(express.json());

app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
  })
);

app.set('views', path.join(__dirname, 'public'));

app.set('view engine', 'ejs');

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

// Serve static files from the public folder
app.use(express.static('public'));

// Body parsing middleware
app.use(express.urlencoded({ extended: false }));

// Define a route for the home page
app.get('/', (req, res) => {
  res.render('home');
});

// Define a route for the sign-up page
app.get('/signup', (req, res) => {
  res.render('signup');
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
          res.redirect('/signup');
        } else {
          console.log('User registered successfully');
          res.redirect('/login');
        }
      }
    );
  } catch (error) {
    console.error(error);
    res.redirect('/signup');
  }
});

// Define a route for the login page
app.get('/login', (req, res) => {
  res.render('index');
});

// Define a route for user authentication
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
      if (error) {
        console.error('Error authenticating user:', error);
        res.status(500).send('Error authenticating user');
      } else {
        const user = results[0];
        console.log('User object:', user);

        if (user && (await bcrypt.compare(password, user.password))) {
          req.session.userId = user.ID;
          res.redirect('/dashboard');
        } else {
          res.redirect('/login');
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Define a route for the dashboard page
app.get('/dashboard', (req, res) => {
  const userId = req.session.userId;
  console.log('Tasks');
  if (userId) {
    db.query('SELECT * FROM tasks WHERE userId = ?', [userId], (error, tasks) => {
      if (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).send('Error fetching tasks');
        console.log('Tasks-not');
      } else {
        res.render('dashboard', { tasks });
        console.log('Tasks-fetched');
      }
    });
  } else {
    res.redirect('/login');
  }
});

app.post('/add-task', (req, res) => {
  const userId = req.session.userId;
  const { taskName, laneNumber } = req.body;

  if (userId && taskName && laneNumber) {
    db.query('INSERT INTO tasks (userId, task_name, lane_number) VALUES (?, ?, ?)', [userId, taskName, laneNumber], (error, results) => {
      if (error) {
        console.error('Error adding task to the database:', error);
        res.status(500).send('Error adding task to the database');
      } else {
        res.status(200).send('Task added successfully');
      }
    });
  } else {
    res.status(400).send('Invalid request');
  }
});


// Define a route to get tasks
app.get('/get-tasks', (req, res) => {
  const userId = req.session.userId;
  if (userId) {
    db.query('SELECT * FROM tasks WHERE userId = ?', [userId], (error, tasks) => {
      if (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).send('Error fetching tasks');
      } else {
        console.log('Fetched tasks:', tasks); // Add this line
        res.json(tasks);
      }
    });
  } else {
    res.status(403).send('Unauthorized');
  }
});


app.post('/update-task-lane', (req, res) => {
  const { taskID, newLaneNumber } = req.body;

  // Ensure the variable name used here matches the one in the fetch request
  db.query('UPDATE tasks SET lane_number = ? WHERE taskID = ?', [newLaneNumber, taskID], (error, results) => {
    if (error) {
      console.error('Error updating task lane_number:', error);
      res.status(500).send('Error updating task lane_number');
    } else {
      console.log('Task lane updated successfully');
      res.status(200).send('Task lane_number updated successfully');
    }
  });
});


app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
});

app.get('*', (req, res) => {
  res.status(404).render('error404');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
