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

app.get('/get-active-sprint', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
      return res.status(403).send('Unauthorized');
  }

  // Fetch active sprint for the user
  db.query('SELECT * FROM sprints WHERE userId = ? AND status = "active"', [userId], (error, results) => {
      if (error) {
          console.error('Error fetching active sprint:', error);
          return res.status(500).send('Error fetching active sprint');
      }

      // Check if results is an array and has length
      if (Array.isArray(results) && results.length > 0) {
          res.status(200).json(results);
      } else {
          console.error('No active sprint found or invalid response format');
          res.status(404).send('No active sprint found');
      }
  });
});



// Define a route for the home page
app.get('/', (req, res) => {
  res.render('home');
});

// Define a route for the sign-up page
app.get('/signup', (req, res) => {
  const errorMessage = req.session.errorMessage;
  req.session.errorMessage = null; // Reset the error message after rendering

  // Prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '-1');

  res.render('signup', { errorMessage });
});

app.get('/backlog', (req, res) => {
  const userId = req.session.userId;

  if (userId) {
      // Fetch active sprint for the user
      db.query('SELECT * FROM sprints WHERE userId = ? AND status = "active"', [userId], (sprintError, activeSprint) => {
          if (sprintError) {
              console.error('Error fetching active sprint:', sprintError);
              return res.status(500).send('Error fetching tasks');
          }

          if (!activeSprint || activeSprint.length === 0) {
              return res.render('backlog', { tasks: [] }); // No active sprint, render with an empty task array
          }

          const activeSprintId = activeSprint[0].sprintID;

          // Fetch tasks only from the active sprint
          db.query('SELECT * FROM tasks WHERE userId = ? AND sprintID = ?', [userId, activeSprintId], (taskError, tasks) => {
              if (taskError) {
                  console.error('Error fetching tasks:', taskError);
                  return res.status(500).send('Error fetching tasks');
              }

              res.render('backlog', { tasks });
          });
      });
  } else {
      res.redirect('/login');
  }
});


// Define a route for user registration
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Email format validation using a regular expression
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      console.error('Invalid email format');
      return res.status(400).render('signup', { errorMessage: 'Invalid email format' });
    }

    // Check if the email is already registered
    db.query('SELECT * FROM users WHERE email = ?', [email], async (selectError, existingUsers) => {
      if (selectError) {
        console.error('Error checking existing user:', selectError);
        return res.status(500).send('Error checking existing user');
      }

      if (existingUsers.length > 0) {
        // User with the same email already exists
        return res.status(400).render('signup', { errorMessage: 'User with this email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      db.query(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, hashedPassword],
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
    });
  } catch (error) {
    console.error(error);
    res.redirect('/signup');
  }
});



// Define a route for the login page
app.get('/login', (req, res) => {
  const errorMessage = req.session.errorMessage;
    req.session.errorMessage = null; // Reset the error message after rendering

    // Prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '-1');

    res.render('index', { errorMessage });
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
          req.session.errorMessage = 'Invalid email or password'; // Set error message
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

  if (userId) {
      // Fetch active sprint for the user
      db.query('SELECT * FROM sprints WHERE userId = ? AND status = "active"', [userId], (sprintError, activeSprint) => {
          if (sprintError) {
              console.error('Error fetching active sprint:', sprintError);
              return res.status(500).send('Error fetching tasks');
          }

          if (!activeSprint || activeSprint.length === 0) {
              return res.render('dashboard', { tasks: [] }); // No active sprint, render with an empty task array
          }

          const activeSprintId = activeSprint[0].sprintID;

          // Fetch tasks only from the active sprint
          db.query('SELECT * FROM tasks WHERE userId = ? AND sprintID = ?', [userId, activeSprintId], (taskError, tasks) => {
              if (taskError) {
                  console.error('Error fetching tasks:', taskError);
                  return res.status(500).send('Error fetching tasks');
              }

              res.render('dashboard', { tasks });
          });
      });
  } else {
      res.redirect('/login');
  }
});


app.post('/add-task', (req, res) => {
  const userId = req.session.userId;
  const { taskName, laneNumber, sprintID } = req.body; // Include sprintID in the request body

  if (userId && taskName && laneNumber && sprintID) {
      db.query('INSERT INTO tasks (userId, task_name, lane_number, sprintID) VALUES (?, ?, ?, ?)', [userId, taskName, laneNumber, sprintID], (error, results) => {
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



app.get('/get-tasks', (req, res) => {
  const userId = req.session.userId;

  if (userId) {
    const taskId = req.query.taskId; // Get the task ID from the query parameter

    if (taskId) {
      // Get the details for the specific task
      db.query('SELECT * FROM tasks WHERE userId = ? AND taskID = ?', [userId, taskId], (error, taskDetails) => {
        if (error) {
          console.error('Error fetching task details:', error);
          res.status(500).send('Error fetching task details');
        } else {
          console.log('Fetched task details:', taskDetails[0]);
          res.json(taskDetails[0]); // Assuming taskDetails is an array with a single task
        }
      });
    } else {
      // Get the active sprint information
      db.query('SELECT * FROM sprints WHERE status = "active"', (error, activeSprint) => {
        if (error) {
          console.error('Error fetching active sprint:', error);
          res.status(500).send('Error fetching active sprint');
        } else {
          if (activeSprint.length === 1) {
            // Get tasks related to the active sprint
            db.query('SELECT * FROM tasks WHERE userId = ? AND sprintId = ?', [userId, activeSprint[0].sprintID], (error, tasks) => {
              if (error) {
                console.error('Error fetching tasks:', error);
                res.status(500).send('Error fetching tasks');
              } else {
                console.log('Fetched tasks:', tasks);
                res.json(tasks);
              }
            });
          } else {
            // No active sprint found, return an empty array
            res.json([]);
          }
        }
      });
    }
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

app.post('/complete-sprint', (req, res) => {
  const userId = req.session.userId;

  // Check if the user is logged in
  if (!userId) {
      return res.status(403).send('Unauthorized');
  }

  // Get the current active sprint for the user
  db.query('SELECT * FROM sprints WHERE userId = ? AND status = "active"', [userId], (error, activeSprint) => {
      if (error) {
          console.error('Error fetching active sprint:', error);
          return res.status(500).send('Error completing sprint');
      }

      if (!activeSprint || activeSprint.length === 0) {
          return res.status(400).send('No active sprint found');
      }

      const activeSprintId = activeSprint[0].sprintID;

      // Update the status column in the sprints table to mark the sprint as completed
      db.query('UPDATE sprints SET status = "completed" WHERE sprintID = ?', [activeSprintId], (updateError, results) => {
          if (updateError) {
              console.error('Error completing sprint:', updateError);
              return res.status(500).send('Error completing sprint');
          }

          // Reload the page or send a response as needed
          res.status(200).send('Sprint completed successfully');
      });
  });
});

app.post('/create-sprint', (req, res) => {
  console.log('Hi there too');
  const userId = req.session.userId;

  // Check if the user is logged in
  if (!userId) {
      return res.status(403).send('Unauthorized');
  }

  // Insert a new row in the sprints table to create a new sprint
  const currentDate = new Date().toISOString().split('T')[0]; // Get the current date in 'YYYY-MM-DD' format

  db.query('INSERT INTO sprints (userId, start_date, status) VALUES (?, ?, "active")', [userId, currentDate], (insertError, results) => {
      if (insertError) {
          console.error('Error creating sprint:', insertError);
          return res.status(500).send('Error creating sprint');
      }

      // Reload the page or send a response as needed
      res.status(200).send('Sprint created successfully');
  });
});



// Inside the /tasks/:taskID route in app.js
app.put('/tasks/:taskID', (req, res) => {
  const taskID = req.params.taskID;
  const { task_name, start_date, end_date, description, role } = req.body;

  db.query(
      'UPDATE tasks SET task_name = ?, description = ?, role = ?, start_date = ?, end_date = ? WHERE taskID = ?',
      [task_name, description, role, start_date, end_date, taskID],
      (error, results) => {
          if (error) {
              console.error('Error updating task:', error);
              res.status(500).send('Error updating task');
          } else {
              console.log('Task updated successfully');
              res.status(200).send('Task updated successfully');
          }
      }
  );
});


app.delete('/tasks/:taskID', (req, res) => {
  const taskID = req.params.taskID;

  db.query('DELETE FROM tasks WHERE taskID = ?', [taskID], (error, results) => {
    if (error) {
      console.error('Error deleting task:', error);
      res.status(500).send('Error deleting task');
    } else {
      console.log('Task deleted successfully');
      res.status(200).send('Task deleted successfully');
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

// Add this route at the end of your app.js file
// Define a route to get the active sprint



// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
