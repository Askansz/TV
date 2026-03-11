/**
 * Digital TV Photo Display - Logic
 * Handles image rotation, preloading, and config updates.
 */

(function() {
    // Configuration and State
    let config = {
        mode: 1,
        images: []
    };
    
    let state = {
        currentImages: [],
        history: [],
        historyLimit: 4,
        currentIndex: -1,
        timer: null,
        configUpdateTimer: null,
        isTransitioning: false
    };

    const container = document.getElementById('display-container');
    const clockElement = document.getElementById('clock');

    /**
     * Initialize the application
     */
    async function init() {
        updateClock();
        setInterval(updateClock, 1000);

        await updateConfig();
        startDisplay();
        
        // Set up periodic config check (every 2 minutes)
        state.configUpdateTimer = setInterval(updateConfig, 120000);
    }

    /**
     * Update the digital clock
     */
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        clockElement.textContent = `${hours}:${minutes}:${seconds}`;
    }

    /**
     * Fetch configuration from config.json
     */
    async function updateConfig() {
        try {
            const timestamp = new Date().getTime();
            const response = await fetch(`config.json?t=${timestamp}`);
            const newConfig = await response.json();
            
            // Check if config actually changed
            const configChanged = JSON.stringify(config) !== JSON.stringify(newConfig);
            
            if (configChanged) {
                console.log('Configuration updated');
                const modeChanged = config.mode !== newConfig.mode;
                config = newConfig;
                
                // Refresh image pool
                state.currentImages = [...config.images];
                shuffleArray(state.currentImages);
                
                // If mode changed, restart display immediately
                if (modeChanged) {
                    startDisplay();
                }
            }
        } catch (error) {
            console.error('Failed to fetch config:', error);
        }
    }

    /**
     * Start or restart the display based on current mode
     */
    function startDisplay() {
        if (state.timer) clearTimeout(state.timer);
        container.innerHTML = '';
        
        switch (config.mode) {
            case 1:
                showNextMode1();
                break;
            case 2:
                showNextMode2();
                break;
            case 3:
                showMode3();
                break;
            default:
                showMode3();
        }
    }

    /**
     * Mode 1: Fullscreen Slideshow
     */
    async function showNextMode1() {
        if (state.isTransitioning) return;
        state.isTransitioning = true;

        const imageUrl = getNextImage();
        if (!imageUrl) {
            state.isTransitioning = false;
            state.timer = setTimeout(showNextMode1, 5000);
            return;
        }

        // Preload
        const img = await preloadImage(imageUrl);
        img.className = 'slideshow-image';
        
        const oldActive = container.querySelector('.slideshow-image.active');
        container.appendChild(img);
        
        // Trigger fade
        requestAnimationFrame(() => {
            img.classList.add('active');
            if (oldActive) {
                oldActive.classList.remove('active');
                setTimeout(() => oldActive.remove(), 2000); // Remove after transition
            }
            state.isTransitioning = false;
        });

        state.timer = setTimeout(showNextMode1, 5000);
    }

    /**
     * Mode 2: Masonry Grid
     */
    async function showNextMode2() {
        if (state.isTransitioning) return;
        state.isTransitioning = true;

        const count = 5;
        const imageUrls = getMultipleImages(count);
        
        if (imageUrls.length === 0) {
            state.isTransitioning = false;
            state.timer = setTimeout(showNextMode2, 20000);
            return;
        }

        // Preload all
        await Promise.all(imageUrls.map(url => preloadImage(url)));

        const grid = document.createElement('div');
        grid.className = 'grid-container';
        
        imageUrls.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.className = 'grid-item';
            grid.appendChild(img);
        });

        const oldGrid = container.querySelector('.grid-container.active');
        container.appendChild(grid);

        requestAnimationFrame(() => {
            grid.classList.add('active');
            if (oldGrid) {
                oldGrid.classList.remove('active');
                setTimeout(() => oldGrid.remove(), 2000);
            }
            state.isTransitioning = false;
        });

        state.timer = setTimeout(showNextMode2, 20000);
    }

    /**
     * Mode 3: Placeholder
     */
    function showMode3() {
        container.innerHTML = `
            <div class="message-container active">
                <h1>Mode 3 reserved for future display mode</h1>
            </div>
        `;
    }

    /**
     * Get next image URL avoiding recent history
     */
    function getNextImage() {
        if (!config.images || config.images.length === 0) return null;
        
        // If only one image, just return it
        if (config.images.length === 1) return config.images[0];

        let available = config.images.filter(img => !state.history.includes(img));
        
        // If we ran out of available images (history too long), reset history partially
        if (available.length === 0) {
            state.history = state.history.slice(-1);
            available = config.images.filter(img => !state.history.includes(img));
        }

        const randomIndex = Math.floor(Math.random() * available.length);
        const selected = available[randomIndex];
        
        updateHistory(selected);
        return selected;
    }

    /**
     * Get multiple unique images for grid
     */
    function getMultipleImages(count) {
        if (!config.images || config.images.length === 0) return [];
        
        // Shuffle and pick
        let pool = [...config.images];
        shuffleArray(pool);
        
        // Avoid images from current grid if possible
        const currentGridImages = Array.from(container.querySelectorAll('.grid-item')).map(img => img.src);
        let preferred = pool.filter(img => !currentGridImages.includes(img));
        
        if (preferred.length < count) {
            return pool.slice(0, Math.min(count, pool.length));
        }
        
        return preferred.slice(0, count);
    }

    /**
     * Update history of shown images
     */
    function updateHistory(url) {
        state.history.push(url);
        if (state.history.length > state.historyLimit) {
            state.history.shift();
        }
    }

    /**
     * Preload an image
     */
    function preloadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    /**
     * Helper: Shuffle array
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Start
    init();

})();
