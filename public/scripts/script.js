document.addEventListener('DOMContentLoaded', function () {
  const redirectButton = document.getElementById('redirectButton');
  const notificationButton = document.getElementById('notificationButton');

  redirectButton.addEventListener('click', function () {
    // Redirect to the About page
    window.location.href = '/about.html';
  });

  notificationButton.addEventListener('click', function () {
    // Show a notification
    showNotification('Good thing you clicked here');
  });

  function showNotification(message) {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(message);
        } else if (permission === 'denied') {
          alert('Notifications are blocked. Please enable them in your browser settings.');
        } else {
          alert('Notifications are not supported in your browser.');
        }
      });
    } else {
      alert('Notifications are not supported in your browser.');
    }
  }
});
