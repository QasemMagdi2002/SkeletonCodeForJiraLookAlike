const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
console.log('Form submitted');

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const value = input.value;

  if (!value) return;
  console.log('OP');
  const selectedLaneNumber = 1; // Set the default lane number (you can modify this based on your logic)
  try {
    // Add the new task to the server
    const response = await fetch('/add-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskName: value,
        laneNumber: selectedLaneNumber,
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
      console.log('Hello');

      input.value = "";
    } else {
      console.error('Error adding task:', response.statusText);
    }
  } catch (error) {
    console.error('Error adding task:', error);
  }
});
