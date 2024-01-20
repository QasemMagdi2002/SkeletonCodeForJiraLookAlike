const forms = document.getElementById("todo-forms");
const inputs = document.getElementById("todo-inputs");

forms.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = inputs.value;

    if (!value) return;

    const selectedLaneNumber = 6;

    try {
        const sprintResponse = await fetch('/get-active-sprint');
        if (!sprintResponse.ok) {
            console.error('Error fetching active sprint:', sprintResponse.statusText);
            return;
        }

        const activeSprint = await sprintResponse.json();

        console.log('Active Sprint:', activeSprint);

        // Check if activeSprint is an array and has length
        if (activeSprint && (Array.isArray(activeSprint) && activeSprint.length > 0) || (!Array.isArray(activeSprint) && activeSprint.hasOwnProperty('sprintID'))) {
            const activeSprintId = Array.isArray(activeSprint) ? activeSprint[0].sprintID : activeSprint.sprintID;
            console.log('There is an active sprint');

            const response = await fetch('/add-task', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    taskName: value,
                    laneNumber: selectedLaneNumber,
                    sprintID: activeSprintId,
                }),
            });

            if (response.ok) {
                // Task added successfully, update UI as needed
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

                inputs.value = "";
            } else {
                console.error('Error adding task:', response.statusText);
            }
        } else {
            console.error('No active sprint found or invalid response format');
        }
    } catch (error) {
        console.error('Error adding task:', error);
    }
});



async function completeSprint() {
    try {
        // Make a fetch request to your server to mark the current sprint as completed
        const response = await fetch('/complete-sprint', {
            method: 'POST',
        });

        if (response.ok) {
            // Reload the page or update the UI as needed
            location.reload();
        } else {
            console.error('Failed to complete sprint');
        }
    } catch (error) {
        console.error('Error completing sprint:', error);
    }
}

async function createSprint() {
    console.log('Hi there');
    try {
        // Make a fetch request to your server to create a new sprint
        const response = await fetch('/create-sprint', {
            method: 'POST',
        });

        if (response.ok) {
            // Reload the page or update the UI as needed
            location.reload();
        } else {
            console.error('Failed to create sprint');
        }
    } catch (error) {
        console.error('Error creating sprint:', error);
    }
}