document.getElementById('imageUpload').addEventListener('change', function(event) {
    var imageContainer = document.getElementById('imageContainer');
    var file = event.target.files[0];
    var reader = new FileReader();
    
    reader.onload = function(e) {
        imageContainer.style.backgroundImage = 'url(' + e.target.result + ')';
        imageContainer.style.backgroundSize = 'cover';
        imageContainer.style.backgroundPosition = 'center';
    };
    
    reader.readAsDataURL(file);
});

function updateProfile() {
    // Retrieve password and confirm password values
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmpassword').value;

    // Retrieve the error message element
    const passwordError = document.getElementById('passwordError');

    // Check if passwords match
    if (password !== confirmPassword) {
        // Show error message in red
        passwordError.innerText = 'Passwords do not match';
        passwordError.style.color = 'red';

        // Prevent form submission
        return false;
    } else {
        // Clear error message
        passwordError.innerText = '';
        passwordError.style.color = '';

        // Allow form submission
        return true;
    }
}

