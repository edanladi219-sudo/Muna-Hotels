document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        window.location.href = 'home.html';
        return;
    }

    const loginToggle = document.getElementById('login-toggle');
    const signupToggle = document.getElementById('signup-toggle');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    loginToggle.addEventListener('click', function() {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        loginToggle.classList.add('active');
        signupToggle.classList.remove('active');
    });

    signupToggle.addEventListener('click', function() {
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        signupToggle.classList.add('active');
        loginToggle.classList.remove('active');
    });

    // Sign Up Form Submission
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const username = document.getElementById('signup-username').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const message = document.getElementById('signup-message');

        if (password !== confirmPassword) {
            message.textContent = 'Passwords do not match!';
            return;
        }

        // Get existing users
        let users = JSON.parse(localStorage.getItem('users')) || [];

        // Check if user already exists
        const existingUser = users.find(user => user.email === email || user.username === username);
        if (existingUser) {
            message.textContent = 'User with this email or username already exists!';
            return;
        }

        // Add new user
        users.push({ name, email, username, password });
        localStorage.setItem('users', JSON.stringify(users));

        message.style.color = 'green';
        message.textContent = 'Sign up successful! You can now log in.';
        signupForm.reset();
    });

    // Login Form Submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const identifier = document.getElementById('login-email').value; // email or username
        const password = document.getElementById('login-password').value;
        const message = document.getElementById('login-message');

        // Get existing users
        const users = JSON.parse(localStorage.getItem('users')) || [];

        // Find user
        const user = users.find(user => (user.email === identifier || user.username === identifier) && user.password === password);

        if (user) {
            message.style.color = 'green';
            message.textContent = `Welcome back, ${user.name}!`;
            localStorage.setItem('currentUser', JSON.stringify(user));
            // Redirect to home page after successful login
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1000); // Small delay to show the message
        } else {
            message.textContent = 'Invalid email/username or password!';
        }
    });
});