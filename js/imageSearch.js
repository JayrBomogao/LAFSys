// Image Search functionality
class ImageSearch {
    constructor() {
        this.uploadBtn = document.getElementById('uploadBtn');
        this.imageUpload = document.getElementById('imageUpload');
        this.imagePreview = document.getElementById('imagePreview');
        this.findMatchesBtn = document.getElementById('findMatchesBtn');
        this.searchResults = document.getElementById('searchResults');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Trigger file input when upload button is clicked
        this.uploadBtn.addEventListener('click', () => {
            this.imageUpload.click();
        });

        // Handle file selection
        this.imageUpload.addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        // Find matches button
        this.findMatchesBtn.addEventListener('click', () => {
            this.findSimilarItems();
        });
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Check if the file is an image
        if (!file.type.match('image.*')) {
            alert('Please select a valid image file (JPEG, PNG, etc.)');
            return;
        }

        // Create a preview of the uploaded image
        const reader = new FileReader();
        reader.onload = (e) => {
            this.imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            this.findMatchesBtn.disabled = false;
            this.searchResults.innerHTML = ''; // Clear previous results
        };
        reader.readAsDataURL(file);
    }

    async findSimilarItems() {
        // Show loading state
        this.findMatchesBtn.disabled = true;
        this.findMatchesBtn.innerHTML = '<span class="loading">Searching...</span>';
        this.searchResults.innerHTML = '<p class="searching">Finding similar items...</p>';

        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Get a random sample of items (in a real app, this would be an API call)
            const items = await getItems();
            const sampleItems = this.getRandomItems(items, 3); // Get 3 random items as matches
            
            // Display the results
            this.displaySearchResults(sampleItems);
        } catch (error) {
            console.error('Error finding similar items:', error);
            this.searchResults.innerHTML = '<p class="error">An error occurred while searching. Please try again.</p>';
        } finally {
            this.findMatchesBtn.disabled = false;
            this.findMatchesBtn.textContent = 'Find Matches';
        }
    }

    getRandomItems(items, count) {
        // Get a random sample of items from the array
        const shuffled = [...items].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, items.length));
    }

    displaySearchResults(items) {
        if (!items || items.length === 0) {
            this.searchResults.innerHTML = '<p>No matching items found.</p>';
            return;
        }

        const resultsHTML = items.map(item => `
            <div class="search-result-item" data-id="${item.id}">
                <img src="${item.image}" alt="${item.title}">
                <p>${item.title}</p>
            </div>
        `).join('');

        this.searchResults.innerHTML = resultsHTML;

        // Add click event to result items
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', async () => {
                const itemId = item.dataset.id;
                const item = await getItemById(parseInt(itemId));
                if (item) {
                    window.imageSearchModal.close();
                    openItemDetails(item);
                }
            });
        });
    }
}

// Initialize image search when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize image search if the elements exist on the page
    if (document.getElementById('imageSearchBtn')) {
        const imageSearch = new ImageSearch();
        
        // Add click event to the image search button in the header
        document.getElementById('imageSearchBtn').addEventListener('click', () => {
            // Reset the image search modal
            document.getElementById('imageUpload').value = '';
            document.getElementById('imagePreview').innerHTML = '<p>No image selected</p>';
            document.getElementById('findMatchesBtn').disabled = true;
            document.getElementById('searchResults').innerHTML = '';
            
            // Open the modal
            window.imageSearchModal.open();
        });
    }
});
