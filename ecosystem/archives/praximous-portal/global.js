document.addEventListener('DOMContentLoaded', () => {
    // --- Global DOM Element Selectors ---
    const themeToggle = document.getElementById('theme-toggle');
    const backToTopBtn = document.querySelector('.back-to-top-btn');
    const mainNav = document.querySelector('.navbar.sticky-top'); 

    // --- Functions ---

    /**
     * Toggles the light/dark theme.
     */
    function toggleTheme() {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        updateThemeIcon(isDarkMode);
    }

    /**
     * Updates the theme toggle button's icon based on the current theme.
     * @param {boolean} isDarkMode - The current theme state.
     */
    function updateThemeIcon(isDarkMode) {
        if (themeToggle) {
            themeToggle.innerHTML = isDarkMode ? '<i class="bi bi-moon-stars-fill"></i>' : '<i class="bi bi-sun-fill"></i>';
        }
    }

    /**
     * Applies the saved theme from localStorage on page load.
     */
    function applySavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        const isDarkMode = savedTheme === 'dark';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        }
        updateThemeIcon(isDarkMode);
    }

    /**
     * Handles scroll-based UI changes like navbar shrink and back-to-top button.
     */
    function handleScroll() {
        // Navbar shrink effect
        if (mainNav) {
            if (window.scrollY > 50) {
                mainNav.classList.add('navbar-scrolled');
            } else {
                mainNav.classList.remove('navbar-scrolled');
            }
        }

        // Back to top button visibility
        if (backToTopBtn) {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        }
    }

    // --- Event Listeners ---
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    window.addEventListener('scroll', handleScroll);

    // --- App Initialization ---
    applySavedTheme();
    handleScroll(); // Run on load to set initial state correctly
});