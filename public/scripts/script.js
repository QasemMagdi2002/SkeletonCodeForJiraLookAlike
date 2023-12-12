document.addEventListener('DOMContentLoaded', function () {
  const redirectButton = document.getElementsByClassName('Sign')[0];

  redirectButton.addEventListener('click', function () {
    // Redirect to the About page
    window.location.href = '/signup.html';
  });
});
