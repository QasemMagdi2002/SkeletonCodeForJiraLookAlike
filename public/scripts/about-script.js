document.addEventListener('DOMContentLoaded', function () {
  const returnButton = document.getElementsByClassName('Sign-in')[0];

  returnButton.addEventListener('click', function () {
    // Return to the Home page
    window.location.href = '/login';
  });
});
