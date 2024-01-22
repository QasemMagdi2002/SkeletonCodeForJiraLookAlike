function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    var main = document.getElementById('main');
    var sidebarright = document.getElementById('sidebar-right');

    if (sidebarright.style.width === '0' || sidebarright.style.width === '') {

    } else {
        sidebarright.style.width = '';
    }

    if (sidebar.style.width === '250px') {
        sidebar.style.width = '0';
        main.style.marginLeft = '0';
    } else {
        sidebar.style.width = '250px';
        main.style.marginLeft = '250px';
        populatesidebar();
    }

}
function populatesidebar() {
    
}