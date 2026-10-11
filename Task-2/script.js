// Contact Form

const contactForm = document.getElementById("contactForm");

const formMessage = document.getElementById("formMessage");


contactForm.addEventListener("submit", function(event) {

    // Prevent page refresh
    event.preventDefault();

    // Get values
    const name = document.getElementById("name").value;

    const email = document.getElementById("email").value;

    const message = document.getElementById("message").value;


    // Check whether fields are filled
    if (name === "" || email === "" || message === "") {

        formMessage.textContent =
            "Please fill all the fields.";

        return;
    }


    // Display success message
    formMessage.textContent =
        "Thank you, " + name + "! Your message has been received.";


    // Clear form
    contactForm.reset();

});