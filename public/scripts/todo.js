const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");

console.log('Form submitted');

// Update the 'todo-form' event listener
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const value = input.value;

  if (!value) return;

  const selectedLaneNumber = 1; // Set the default lane number (you can modify this based on your logic)

  try {
      // Fetch active sprint for the user
      const sprintResponse = await fetch('/get-active-sprint');
      const activeSprint = await sprintResponse.json();

      if (activeSprint && activeSprint.length > 0) {
          const activeSprintId = activeSprint[0].sprintID;

          // Add the new task to the server with the sprintID
          const response = await fetch('/add-task', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  taskName: value,
                  laneNumber: selectedLaneNumber,
                  sprintID: activeSprintId, // Add sprintID when creating a task
              }),
          });

          if (response.ok) {
              const newTask = document.createElement("p");
              newTask.classList.add("task");
              newTask.setAttribute("draggable", "true");
              newTask.innerText = value;
              newTask.onclick = toggleSidebarright;

              newTask.addEventListener("dragstart", () => {
                  newTask.classList.add("is-dragging");
              });

              newTask.addEventListener("dragend", () => {
                  newTask.classList.remove("is-dragging");
              });

              const todoLane = document.querySelector(`[data-lane-number="${selectedLaneNumber}"]`);
              todoLane.appendChild(newTask);

              input.value = "";
              location.reload();
          } else {
              console.error('Error adding task:', response.statusText);
          }
      } else {
          console.error('No active sprint found');
      }
  } catch (error) {
      console.error('Error adding task:', error);
  }
});

