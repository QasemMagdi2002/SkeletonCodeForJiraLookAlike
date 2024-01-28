const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const session = require('express-session');
const ExcelJS = require('exceljs');

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

app.get('/index', (req,res) => {
  res.render('index');
});

app.get('/about', (req,res) => {
  res.render('aboutus');
});

app.get('/services', (req,res) => {
  res.render('services');
});

app.get('/userprofile', (req, res) => {
  const userId = req.session.userId;app.post('/userprofile', async (req, res) => {
    const userId = req.session.userId;
    const { firstname, lastname, username, password, confirmpassword } = req.body;
  
    if (!userId) {
      return res.redirect('/login');
    }
  
    // Check if the new password and confirm password match
    if (password !== confirmpassword) {
      return res.status(400).send('Password and Confirm Password do not match');
    }
  
    try {
      // If the password is provided, hash and update it
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
  
      // Update the user's information in the database
      db.query(
        'UPDATE users SET first_name = ?, last_name = ?, username = ?, password = ? WHERE ID = ?',
        [firstname, lastname, username, hashedPassword, userId],
        (error, results) => {
          if (error) {
            console.error('Error updating user profile:', error);
            return res.status(500).send('Error updating user profile');
          }
  
          // Redirect to the user profile page after updating
          res.redirect('/userprofile');
        }
      );
    } catch (hashError) {
      console.error('Error hashing password:', hashError);
      res.status(500).send('Error updating user profile');
    }
  });
  

  if (!userId) {
    return res.redirect('/login');
  }

  // Fetch user data including the new fields (last_name, username)
  db.query('SELECT * FROM users WHERE ID = ?', [userId], (error, userData) => {
    if (error) {
      console.error('Error fetching user data:', error);
      return res.status(500).send('Error fetching user data');
    }

    if (userData.length === 1) {
      // Render the userprofile view with user data
      res.render('userprofile', { userData: userData[0] });
    } else {
      console.error('User not found or invalid response format');
      res.status(404).render('error404');
    }
  });
});


app.get('/generateExcel', async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(403).send('Unauthorized');
  }

  try {
    // Fetch user information
    const [users] = await db.promise().query('SELECT * FROM users WHERE ID = ?', [userId]);
    const user = users[0]; // Assuming user ID is unique

    // Fetch the currently active sprint for the user
    const [activeSprint] = await db.promise().query('SELECT * FROM sprints WHERE userId = ? AND status = "active"', [userId]);

    if (!activeSprint || activeSprint.length === 0) {
      return res.status(404).send('No active sprint found');
    }

    // Fetch tasks associated with the currently active sprint
    const [userTasks] = await db.promise().query('SELECT * FROM tasks WHERE userId = ? AND sprintID = ?', [userId, activeSprint[0].sprintID]);

    // Create a new Excel workbook and add a worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Summary');

    // Add columns for user information
    worksheet.columns = [
      { header: 'User ID', key: 'userId', width: 10 },
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Email Address', key: 'email', width: 30 },
    ];

    // Add columns for task information
    const taskColumns = [];

    // Dynamically add columns for tasks and their details
    userTasks.forEach(task => {
      const taskKey = `task_${task.taskID}`;
      taskColumns.push({ header: `Task ${task.taskID}`, key: taskKey, width: 25 });
      taskColumns.push({ header: `Description ${task.taskID}`, key: `description_${task.taskID}`, width: 30 });
      taskColumns.push({ header: `Role ${task.taskID}`, key: `role_${task.taskID}`, width: 20 });
      taskColumns.push({ header: `Start Date ${task.taskID}`, key: `startDate_${task.taskID}`, width: 15 });
      taskColumns.push({ header: `End Date ${task.taskID}`, key: `endDate_${task.taskID}`, width: 15 });
    });

    worksheet.columns = [...worksheet.columns, ...taskColumns];

    // Add row with user data and task details
    const userData = {
      userId: user.ID,
      firstName: user.name,
      lastName: user.last_name,
      email: user.email,
    };

    // Add data for user's tasks and their details
    userTasks.forEach(task => {
      userData[`task_${task.taskID}`] = task.task_name;
      userData[`description_${task.taskID}`] = task.description;
      userData[`role_${task.taskID}`] = task.role;
      userData[`startDate_${task.taskID}`] = task.start_date;
      userData[`endDate_${task.taskID}`] = task.end_date;
    });

    worksheet.addRow(userData);

    // Save the workbook
    const filePath = path.join(__dirname, 'summary.xlsx');
    await workbook.xlsx.writeFile(filePath);

    // Respond with a download link or other appropriate response
    res.download(filePath, 'summary.xlsx', (err) => {
      if (err) {
        console.log('Error sending file:', err);
      } else {
        console.log('Excel file sent successfully');
      }
    });
  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(500).send('Error generating Excel');
  }
});



app.post('/userprofile', async (req, res) => {
  const userId = req.session.userId;
  const { firstname, lastname, username, password, confirmpassword } = req.body;

  if (!userId) {
    return res.redirect('/login');
  }

  // Check if the new password and confirm password match
  if (password !== confirmpassword) {
    return res.status(400).send('Password and Confirm Password do not match');
  }

  try {
    // Check if a new password is provided
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    // Update the user's information in the database
    const updateValues = [firstname, lastname, username];
    if (hashedPassword) {
      // Include the hashed password in the update if provided
      updateValues.push(hashedPassword);
    }
    updateValues.push(userId);

    db.query(
      'UPDATE users SET name = ?, last_name = ?, username = ?' + (hashedPassword ? ', password = ?' : '') + ' WHERE ID = ?',
      updateValues,
      (error, results) => {
        if (error) {
          console.error('Error updating user profile:', error);
          return res.status(500).send('Error updating user profile');
        }

        // Redirect to the user profile page after updating
        res.redirect('/userprofile');
      }
    );
  } catch (hashError) {
    console.error('Error hashing password:', hashError);
    res.status(500).send('Error updating user profile');
  }
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
    const taskId = req.query.taskId;
    if (taskId) {
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
      db.query('SELECT * FROM sprints WHERE userID = ? AND status = "active"', [userId], (error, activeSprint) => {
        if (error) {
          console.error('Error fetching active sprint:', error);
          res.status(500).send('Error fetching active sprint');
        } else {
          console.log('Active Sprint:', activeSprint);
          if (activeSprint.length === 1) {
            const activeSprintDetails = activeSprint[0];
            db.query('SELECT * FROM tasks WHERE userId = ? AND sprintId = ?', [userId, activeSprintDetails.sprintID], (error, tasks) => {
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


app.get('/get-calendar-events', async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(403).send('Unauthorized');
  }

  try {
    // Fetch the currently active sprint
    db.query('SELECT * FROM sprints WHERE userID = ? AND status = "active"', [userId], async (error, activeSprint) => {
      if (error) {
        console.error('Error fetching active sprint:', error);
        return res.status(500).send('Error fetching active sprint');
      }

      let tasks;
      if (activeSprint.length === 1) {
        const activeSprintDetails = activeSprint[0];
        // Fetch tasks from both the active sprint and other tasks
        tasks = await getTasks(userId, activeSprintDetails.sprintID);
      } else {
        // No active sprint found, fetch all tasks
        tasks = await getTasks(userId);
      }

      // Generate events based on the end dates of tasks
      const events = tasks
        .filter(task => task.lane_number >= 1 && task.lane_number <= 4 && task.end_date)
        .map(task => ({
          title: task.task_name,
          start: task.end_date, // Assuming end_date is the task's deadline
          allDay: true,
          lane_number: task.lane_number,
        }));

      res.json(events);
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to fetch tasks based on user ID and, optionally, sprint ID
async function getTasks(userId, sprintId = null) {
  return new Promise((resolve, reject) => {
    const query = sprintId
      ? 'SELECT * FROM tasks WHERE userId = ? AND sprintId = ?'
      : 'SELECT * FROM tasks WHERE userId = ?';

    const params = sprintId ? [userId, sprintId] : [userId];

    db.query(query, params, (error, tasks) => {
      if (error) {
        console.error('Error fetching tasks:', error);
        reject(error);
      } else {
        console.log('Fetched tasks:', tasks);
        resolve(tasks);
      }
    });
  });
}



app.get('/calendar', (req, res) => {
  res.render('calendar');
});


app.post('/update-task-lane', (req, res) => {
  const { taskID, lane_number } = req.body;

  // Ensure the variable name used here matches the one in the fetch request
  db.query('UPDATE tasks SET lane_number = ? WHERE taskID = ?', [lane_number, taskID], (error, results) => {
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

// Add this route for handling profile deletion
app.post('/delete-profile', async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.redirect('/login');
  }

  try {
    // Fetch active sprint for the user
    db.query('SELECT * FROM sprints WHERE userId = ? AND status = "active"', [userId], (sprintError, activeSprint) => {
      if (sprintError) {
        console.error('Error fetching active sprint:', sprintError);
        return res.status(500).send('Error deleting profile');
      }

      // Complete and delete the active sprint
      if (activeSprint && activeSprint.length > 0) {
        const activeSprintId = activeSprint[0].sprintID;

        // Complete the active sprint
        db.query('UPDATE sprints SET status = "completed" WHERE sprintID = ?', [activeSprintId], (completeError) => {
          if (completeError) {
            console.error('Error completing sprint:', completeError);
            return res.status(500).send('Error deleting profile');
          }

          // Delete tasks associated with the completed sprint
          db.query('DELETE FROM tasks WHERE sprintID = ?', [activeSprintId], (deleteTasksError) => {
            if (deleteTasksError) {
              console.error('Error deleting tasks:', deleteTasksError);
              return res.status(500).send('Error deleting profile');
            }

            // Delete the completed sprint
            db.query('DELETE FROM sprints WHERE sprintID = ?', [activeSprintId], (deleteSprintError) => {
              if (deleteSprintError) {
                console.error('Error deleting sprint:', deleteSprintError);
                return res.status(500).send('Error deleting profile');
              }

              // Delete the user
              db.query('DELETE FROM users WHERE ID = ?', [userId], (deleteUserError) => {
                if (deleteUserError) {
                  console.error('Error deleting user:', deleteUserError);
                  return res.status(500).send('Error deleting profile');
                }

                // Destroy the session and redirect to the login page
                req.session.destroy((destroyError) => {
                  if (destroyError) {
                    console.error('Error destroying session:', destroyError);
                  }
                  res.redirect('/login');
                });
              });
            });
          });
        });
      } else {
        // No active sprint, delete the user without completing any sprint
        db.query('DELETE FROM users WHERE ID = ?', [userId], (deleteUserError) => {
          if (deleteUserError) {
            console.error('Error deleting user:', deleteUserError);
            return res.status(500).send('Error deleting profile');
          }

          // Destroy the session and redirect to the login page
          req.session.destroy((destroyError) => {
            if (destroyError) {
              console.error('Error destroying session:', destroyError);
            }
            res.redirect('/login');
          });
        });
      }
    });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).send('Error deleting profile');
  }
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
