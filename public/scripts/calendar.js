document.addEventListener('DOMContentLoaded', function () {
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const YEARS_RANGE = 10;
  let currentMonth;
  let currentYear;
  let events = []; // New variable to store events

  const days = document.querySelectorAll('.day');

  // Add the side elements
  const side = document.getElementById('side');
  const dueTasksElement = document.getElementById('due-tasks');
  const overdueTasksElement = document.getElementById('overdue-tasks');

  function initCalendar() {
    const currentDate = new Date();
    currentMonth = currentDate.getMonth();
    currentYear = currentDate.getFullYear();
    fetchCalendarEvents(); // Fetch calendar events on initialization
    updateCalendar();

    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));
    document.getElementById('prev-year').addEventListener('click', () => changeYear(-1));
    document.getElementById('next-year').addEventListener('click', () => changeYear(1));
  }

  async function fetchCalendarEvents() {
    try {
      const response = await fetch('/get-tasks');
      if (response.ok) {
        const tasks = await response.json();
  
        // Format the end_date property for accurate comparisons
        events = tasks.map(task => ({
          title: task.task_name,
          end_date: task.end_date ? new Date(task.end_date).toISOString().split('T')[0] : null, // Format end_date
          lane_number:task.lane_number,
          allDay: true,
        }));
  
        updateSidebar(tasks); // Update side with tasks information
        updateCalendar();
      } else {
        console.error('Failed to fetch calendar events');
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  }
  

  function updateSidebar() {
    // Calculate due and overdue tasks
    console.log('events', events);
    const currentDate = new Date();
    const dueTasks = events.filter(event => new Date(event.end_date) >= currentDate && event.lane_number < 4).length;
    const overdueTasks = events.filter(event => new Date(event.end_date) < currentDate && event.lane_number < 4).length;
  
    // Update side content
    dueTasksElement.textContent = `Due Tasks: ${dueTasks}`;
    overdueTasksElement.textContent = `Overdue Tasks: ${overdueTasks}`;
  }
  
  
  

  function updateCalendar() {
    document.getElementById('month-year').textContent = `${MONTHS[currentMonth]} ${currentYear}`;
  
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let day = 1;
  
    for (let i = 0; i < days.length; i++) {
      days[i].textContent = '';
  
      if (i >= firstDay && day <= daysInMonth) {
        days[i].textContent = day;
  
        const currentDate = new Date(currentYear, currentMonth, day).toISOString().split('T')[0];
        const isEventDay = events.some(event => event.end_date && event.end_date === currentDate);
        const isCurrentDay = currentDate === new Date().toISOString().split('T')[0];
  
        if (isCurrentDay) {
          days[i].classList.add('current-day');
        }
  
        if (isEventDay) {
          days[i].classList.add('highlight');
        } else {
          days[i].classList.remove('highlight');
        }
  
        days[i].classList.add('active');
        day++;
      } else {
        days[i].classList.remove('active', 'highlight', 'current-day');
      }
    }
  }
  
  


  function changeMonth(increment) {
    currentMonth += increment;

    if (currentMonth === 12) {
      currentMonth = 0;
      currentYear++;
    } else if (currentMonth === -1) {
      currentMonth = 11;
      currentYear--;
    }

    fetchCalendarEvents(); // Fetch updated calendar events when changing month
  }

  function changeYear(increment) {
    currentYear += increment;
    fetchCalendarEvents(); // Fetch updated calendar events when changing year
  }

  initCalendar();
});
