document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Fetch tasks from the server
    const response = await fetch('/get-tasks', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const tasks = await response.json();

      // Loop through tasks and place them in the correct swim-lanes
      tasks.forEach((task) => {
        const taskElement = document.createElement("p");
        taskElement.classList.add("task");
        taskElement.setAttribute("draggable", "true");
        taskElement.innerText = task.task_name;
        taskElement.setAttribute("data-task-id", task.taskID); // Use task.taskID
        taskElement.onclick = toggleSidebarright;

        taskElement.addEventListener("dragstart", (e) => {
          // Set the currentTaskId when drag starts
          currentTaskId = e.target.dataset.taskId;
          e.target.classList.add("is-dragging");
        });

        taskElement.addEventListener("dragend", (e) => {
          e.target.classList.remove("is-dragging");
        });

        const laneNumber = task.lane_number;
        const lane = document.querySelector(`[data-lane-number="${laneNumber}"]`);

        // Add a check for null or undefined before appending
        if (lane) {
          lane.appendChild(taskElement);
        }
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
});

let currentTaskId; // Variable to store taskId during drag

const draggables = document.querySelectorAll(".task");
const droppables = document.querySelectorAll(".swim-lane");

draggables.forEach((task) => {
  task.addEventListener("dragstart", (event) => {
    // Set the currentTaskId when drag starts
    currentTaskId = event.target.dataset.taskId;

    console.log('Dragging task:', currentTaskId);
    event.target.classList.add("is-dragging");
  });

  task.addEventListener("dragend", (event) => {
    console.log('Dropped task:', currentTaskId);
    event.target.classList.remove("is-dragging");
  });
});

droppables.forEach((zone) => {
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();

    const bottomTask = insertAboveTask(zone, e.clientY);
    const curTask = document.querySelector(".is-dragging");

    if (!bottomTask) {
      zone.appendChild(curTask);
    } else {
      zone.insertBefore(curTask, bottomTask);
    }

    // Update the lane_number in the database when a task is dropped into a new swim-lane
    const newLaneNumber = parseInt(zone.dataset.laneNumber);
    const taskId = currentTaskId;

    console.log('Dropping task:', taskId, 'into lane:', newLaneNumber);

    // Make a fetch request to update the lane_number
    fetch('/update-task-lane', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskID: taskId,
        newLaneNumber: newLaneNumber,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to update task lane_number');
        }
      })
      .catch((error) => {
        console.error('Error updating task lane_number:', error);
      });
  });
});

const insertAboveTask = (zone, mouseY) => {
  const els = zone.querySelectorAll(".task:not(.is-dragging)");

  let closestTask = null;
  let closestOffset = Number.NEGATIVE_INFINITY;

  els.forEach((task) => {
    const { top } = task.getBoundingClientRect();

    const offset = mouseY - top;

    if (offset < 0 && offset > closestOffset) {
      closestOffset = offset;
      closestTask = task;
    }
  });

  return closestTask;
};
