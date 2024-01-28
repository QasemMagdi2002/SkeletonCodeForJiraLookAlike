document.addEventListener("DOMContentLoaded", async () => {
  console.log("mydrag.js executed on backlog.ejs");
  try {
    const response = await fetch('/get-tasks', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const tasks = await response.json();
      console.log('tasks', tasks);
      tasks.forEach((task) => {
        const taskElement = createTaskElement(task);
        const laneNumber = task.lane_number;
        const backlogLane = document.querySelector('.swim-lane[data-lane-number="5"]');
        const swimLaneZ = document.querySelector('.swim-lanez');
        if (backlogLane && laneNumber <= 4) {
          backlogLane.appendChild(taskElement);
        } else if (swimLaneZ && laneNumber === 6) {
          swimLaneZ.appendChild(taskElement.cloneNode(true));
        } else {
          const lane = document.querySelector(`.swim-lane[data-lane-number="${laneNumber}"]`);
          console.log('this is lane',lane);
          if (lane) {
            lane.appendChild(taskElement);
          }
        }

        console.log('Task assigned to lane:', laneNumber);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }

  const draggables = document.querySelectorAll(".task");
  console.log('these are the draggables', draggables);
  const droppables = document.querySelectorAll(".swim-lane, .swim-lanez");
  console.log('these are the droppables', droppables);
  let currentTaskId; // Variable to store taskId during drag

  draggables.forEach((task) => {
    console.log('hello added dragstart');
    task.addEventListener("dragstart", handleDragStart);
    task.addEventListener("dragend", handleDragEnd);
    task.addEventListener("click", () => handleTaskClick(task));
  });

  droppables.forEach((zone) => {
    zone.addEventListener("dragover", (e) => handleDragOver(e, zone));
  });
  // Event listener for the search input
  const searchInput = document.getElementById("searchInput");
  const highlightColor = "#60a1ef";

  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase().trim();

    // Loop through tasks and update border color based on search
    draggables.forEach((task) => {
      const taskName = task.innerText.toLowerCase();
      const isMatch = taskName.includes(searchTerm);

      // Update border color based on whether it's a match or not
      task.style.borderColor = isMatch ? "green" : ""; // Change to your desired color
    });

    // Check if the search input is empty or no match found, then reset border colors
    if (!searchTerm || !Array.from(draggables).some((task) => task.style.borderColor === "green")) {
      draggables.forEach((task) => {
        task.style.borderColor = highlightColor; // Reset border color to default
      });
    }
  });
});

// ... (rest of your existing code)

const createTaskElement = (task) => {
  const taskElement = document.createElement("p");
  taskElement.classList.add("task");
  taskElement.setAttribute("draggable", "true");
  taskElement.innerText = task.task_name;
  taskElement.setAttribute("data-task-id", task.taskID);
  return taskElement;
};

const handleDragStart = (event) => {
  currentTaskId = event.target.dataset.taskId;
  event.target.classList.add("is-dragging");
  console.log('Dragging task:', currentTaskId);
};

const handleDragEnd = (event) => {
  console.log('Drag ended:', currentTaskId);
  console.log('Dropped task:', currentTaskId);
  event.target.classList.remove("is-dragging");
};

const handleDragOver = (e, zone) => {
  e.preventDefault();

  const bottomTask = insertAboveTask(zone, e.clientY);
  const curTask = document.querySelector(".is-dragging");

  if (!bottomTask) {
    zone.appendChild(curTask);
  } else {
    zone.insertBefore(curTask, bottomTask);
  }

  const newLaneNumber = parseInt(zone.dataset.laneNumber);
  const taskId = currentTaskId;

  console.log('Dropping task:', taskId, 'into lane:', newLaneNumber);

  const updatedLaneNumber = newLaneNumber === 5 ? 1 : newLaneNumber;
  fetch('/update-task-lane', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      taskID: taskId,
      lane_number: updatedLaneNumber,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to update task lane_number');
      }
      location.reload();
    })
    .catch((error) => {
      console.error('Error updating task lane_number:', error);
    });
  console.log('Drag over:', currentTaskId, 'Zone:', zone.dataset.laneNumber);
};

const handleTaskClick = async (task) => {
  try {
    const taskId = task.dataset.taskId; // Extract taskId from the task element
    const response = await fetch(`/get-tasks?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const taskDetails = await response.json();
      displayTaskDetails(taskDetails);
      toggleSidebarright();
    } else {
      console.error('Error fetching task details:', response.statusText);
    }
  } catch (error) {
    console.error('Error fetching task details:', error);
  }
};

const displayTaskDetails = (taskDetails) => {
  const sidebarRight = document.getElementById('sidebar-right');
  sidebarRight.innerHTML = `
    <div class="task-sidebar">
      <h3>Task Name: <input type="text" id="taskName_${taskDetails.taskID}" value="${taskDetails.task_name || ''}"></h3>
      <p>Description: <textarea id="description_${taskDetails.taskID}">${taskDetails.description || ''}</textarea></p>
      <p>Role: <input type="text" id="role_${taskDetails.taskID}" value="${taskDetails.role || ''}"></p>

      <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px;">
        <p>Start Date: <input type="date" id="startDate_${taskDetails.taskID}" value="${taskDetails.start_date || ''}"></p>
        <p>End Date: <input type="date" id="endDate_${taskDetails.taskID}" value="${formatDate(taskDetails.end_date)}"></p>
        <p><strong>Start Date:</strong> ${formatDate(taskDetails.start_date)}</p>
        <p><strong>End Date:</strong> ${formatDate(taskDetails.end_date)}</p>
      </div>

      <div class="task-buttons">
        <button class="delete" onclick="deleteTask('${taskDetails.taskID}')"><i class="fa-solid fa-trash"></i></button>
        <button class="save" onclick="saveTask('${taskDetails.taskID}')"><i class="fa-solid fa-floppy-disk"></i></button>
      </div>
    </div>
  `;
};

function formatDate(dateString) {
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  const date = new Date(dateString);

  // Check if the date is valid
  if (isNaN(date)) {
    return 'Invalid Date';
  }

  return date.toLocaleDateString('en-US', options);
}

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
