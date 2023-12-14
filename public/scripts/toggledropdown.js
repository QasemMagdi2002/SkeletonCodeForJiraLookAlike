function toggleDropdown(id) {
    var dropdownContent = document.getElementById(id);
    var dropdownBtn = document.querySelector('.dropdown-btn-' + id);

    dropdownContent.classList.toggle('show-dropdown');
    dropdownBtn.classList.toggle('active');
}