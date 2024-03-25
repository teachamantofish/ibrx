
// Show and hide menus
function openNav() {
    document.getElementById("mySidenav").style.width = "150px";
}

function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
}

// Set up help buttons to show the sibling div
function setupHelpButtons() {
    document.querySelectorAll('.help-button').forEach(function(button) {
        button.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent the default action
            var nextElement = this.parentNode.parentNode.nextElementSibling;
            if (nextElement.style.display === "none") {
                nextElement.style.display = "block";
            } else {
                nextElement.style.display = "none";
            }
        });
    });
}