emailjs.init({
    publicKey: "MfrTxbevOVqkWLJJ6"
});

const form = document.getElementById("contact-form");

form.addEventListener("submit", function(e){

    e.preventDefault();

    emailjs.send(
        "service_0hznh0l",
        "template_6s6sqcz",
        {
            name: document.getElementById("name").value,
            email: document.getElementById("email").value,
            message: document.getElementById("message").value
        }
    )
    .then(() => {

        alert("Message sent successfully!");

        form.reset();

    })
    .catch((error)=>{

        alert("Failed to send message.");

        console.log(error);

    });

});