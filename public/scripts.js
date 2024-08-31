// scripts.js

// Function to show the form for the selected social media
function showForm(platform) {
    document.getElementById('formContainer').classList.remove('hidden'); // Show the modal
    document.getElementById('formTitle').innerText = `Login to ${platform}`; // Set the title dynamically
    document.getElementById('scrapeForm').reset(); // Reset the form fields
    document.getElementById('fileInputField').classList.add('hidden'); // Hide file input by default
    document.getElementById('singleInputFields').classList.remove('hidden'); // Show single input fields by default
}

// Function to hide the form
function hideForm() {
    document.getElementById('formContainer').classList.add('hidden'); // Hide the modal
    document.getElementById('scrapeForm').reset(); // Reset the form fields
}

// Function to handle input type switch
function toggleInputType() {
    const inputType = document.getElementById('inputType').value;
    if (inputType === 'multiple') {
        document.getElementById('fileInputField').classList.remove('hidden');
        document.getElementById('singleInputFields').classList.add('hidden');
        document.getElementById('username').required = false;
        document.getElementById('password').required = false;
        document.getElementById('fileUpload').required = true;
    } else {
        document.getElementById('fileInputField').classList.add('hidden');
        document.getElementById('singleInputFields').classList.remove('hidden');
        document.getElementById('username').required = true;
        document.getElementById('password').required = true;
        document.getElementById('fileUpload').required = false;
    }
}

// Function to handle form submission
async function submitForm(event) {
    event.preventDefault(); // Prevent the default form submission behavior

    const formData = new FormData(document.getElementById('scrapeForm'));
    const inputType = formData.get('inputType');

    try {
        const response = await fetch('/start-scraping', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            alert('Scraping started successfully!');
        } else {
            alert('Failed to start scraping.');
        }
    } catch (error) {
        console.error('Error starting scraping:', error);
        alert('Failed to start scraping.');
    }

    // Close the form after submission
    hideForm();
}
