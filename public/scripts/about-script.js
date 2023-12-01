document.addEventListener('DOMContentLoaded', function () {
  const returnButton = document.getElementById('returnButton');

  returnButton.addEventListener('click', function () {
    // Return to the Home page
    window.location.href = '/';
  });
});
