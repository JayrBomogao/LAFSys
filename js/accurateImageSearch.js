/**
 * Accurate Image Search implementation using the improved analyzer
 */
class AccurateImageSearch {
    constructor() {
        // DOM elements
        this.uploadBtn = document.getElementById('uploadBtn');
        this.imageUpload = document.getElementById('imageUpload');
        this.imagePreview = document.getElementById('imagePreview');
        this.findMatchesBtn = document.getElementById('findMatchesBtn');
        this.searchResults = document.getElementById('searchResults');
        
        // Keep track of the currently selected image
        this.selectedImage = null;
        
        console.log('Accurate Image Search initialized');
        
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

        // Store the selected image
        this.selectedImage = file;

        // Create a preview of the uploaded image
        const reader = new FileReader();
        reader.onload = (e) => {
            this.imagePreview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <div class="ai-badge">AI Ready</div>
            `;
            this.findMatchesBtn.disabled = false;
            this.searchResults.innerHTML = ''; // Clear previous results
        };
        reader.readAsDataURL(file);
    }

    async findSimilarItems() {
        if (!this.selectedImage) {
            alert('Please select an image first');
            return;
        }

        // Show loading state
        this.findMatchesBtn.disabled = true;
        this.findMatchesBtn.innerHTML = '<span class="loading">Analyzing image...</span>';
        this.searchResults.innerHTML = '<p class="searching">Analyzing image with AI...</p>';

        try {
            // Use the improved analyzer
            const analysisResults = await window.ImprovedImageAnalyzer.analyzeImage(this.selectedImage);
            console.log('Improved image analysis results:', analysisResults);
            
            // Display analysis results
            this.searchResults.innerHTML = '<p class="analysis-results">Image Analysis Complete</p>';
            this.displayAnalysisResults(analysisResults);
            
            // Find similar items based on the analysis
            const matchingItems = await window.ImprovedImageAnalyzer.findSimilarItems(analysisResults);
            
            // Display the results
            this.displaySearchResults(matchingItems);
        } catch (error) {
            console.error('Error finding similar items:', error);
            this.searchResults.innerHTML = `
                <p class="error">An error occurred during image analysis: ${error.message}</p>
                <p>Please try again or use text search instead.</p>
            `;
        } finally {
            this.findMatchesBtn.disabled = false;
            this.findMatchesBtn.textContent = 'Find Matches';
        }
    }

    /**
     * Display analysis results
     */
    displayAnalysisResults(analysisResults) {
        // Extract labels
        let labelsHtml = '';
        if (analysisResults.labelAnnotations && analysisResults.labelAnnotations.length > 0) {
            labelsHtml = `
                <div class="analysis-section">
                    <h4>Detected Objects</h4>
                    <div class="label-container">
                        ${analysisResults.labelAnnotations.slice(0, 8).map(label => `
                            <span class="label">${label.description}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Extract colors if available
        let colorsHtml = '';
        if (analysisResults.imagePropertiesAnnotation && 
            analysisResults.imagePropertiesAnnotation.dominantColors) {
            const colors = analysisResults.imagePropertiesAnnotation.dominantColors.colors;
            if (colors && colors.length > 0) {
                colorsHtml = `
                    <div class="analysis-section">
                        <h4>Dominant Colors</h4>
                        <div class="color-container">
                            ${colors.slice(0, 5).map(colorInfo => {
                                const {red, green, blue} = colorInfo.color;
                                return `<div class="color-swatch" style="background-color: rgb(${red}, ${green}, ${blue})"></div>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
        }
        
        // Add shape features if available
        let shapesHtml = '';
        if (analysisResults.shapeFeatures) {
            const shapes = [];
            if (analysisResults.shapeFeatures.rectangularity > 0.7) shapes.push('rectangular');
            if (analysisResults.shapeFeatures.circularity > 0.7) shapes.push('circular');
            if (analysisResults.shapeFeatures.symmetry > 0.7) shapes.push('symmetrical');
            
            if (shapes.length > 0) {
                shapesHtml = `
                    <div class="analysis-section">
                        <h4>Shape Features</h4>
                        <div class="label-container">
                            ${shapes.map(shape => `
                                <span class="label">${shape}</span>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        }
        
        // Add the analysis results to the search results element
        const analysisHtml = `
            <div class="analysis-container">
                ${labelsHtml}
                ${colorsHtml}
                ${shapesHtml}
                <div class="analysis-section">
                    <h4>Similar Items</h4>
                </div>
            </div>
        `;
        
        this.searchResults.innerHTML += analysisHtml;
    }

    displaySearchResults(items) {
        if (!items || items.length === 0) {
            this.searchResults.innerHTML += '<p class="no-results">No matching items found.</p>';
            return;
        }

        const resultsHTML = items.map(item => `
            <div class="search-result-item" data-id="${item.id}">
                <div class="result-image">
                    <img src="${item.image}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/100x100?text=No+Image'">
                    ${item.score ? `<div class="match-score">${Math.round(item.score * 100)}% match</div>` : ''}
                </div>
                <div class="result-details">
                    <h4>${item.title || 'Unnamed Item'}</h4>
                    <p>${item.category || 'Uncategorized'}</p>
                    <p>${item.location || 'Unknown location'}</p>
                    <button class="btn btn-sm view-item-btn">View Details</button>
                </div>
            </div>
        `).join('');

        // Append results (don't replace the whole content to preserve the analysis results)
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results-list';
        resultsContainer.innerHTML = resultsHTML;
        this.searchResults.appendChild(resultsContainer);

        // Add click event to result items
        document.querySelectorAll('.search-result-item').forEach(item => {
            const viewBtn = item.querySelector('.view-item-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', async () => {
                    const itemId = item.dataset.id;
                    try {
                        // Get the item data from Firestore
                        const docRef = firebase.firestore().collection('items').doc(itemId);
                        const doc = await docRef.get();
                        
                        if (doc.exists) {
                            const itemData = {
                                id: doc.id,
                                ...doc.data()
                            };
                            
                            // Close the modal and open item details
                            window.imageSearchModal.close();
                            openItemDetails(itemData);
                        } else {
                            console.error('Item not found:', itemId);
                            alert('Item not found');
                        }
                    } catch (error) {
                        console.error('Error getting item:', error);
                        alert('Error loading item details');
                    }
                });
            }
        });
    }
}

// Add improved CSS styles
function addImprovedSearchStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .ai-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background-color: #10b981;
            color: white;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .analysis-container {
            margin-top: 20px;
            background: #f9fafb;
            border-radius: 8px;
            padding: 15px;
        }
        
        .analysis-section {
            margin-bottom: 15px;
        }
        
        .analysis-section h4 {
            margin: 0 0 8px 0;
            font-size: 16px;
            color: #1f2937;
        }
        
        .label-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .label {
            background-color: #e0f2fe;
            color: #0369a1;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
        }
        
        .color-container {
            display: flex;
            gap: 10px;
        }
        
        .color-swatch {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .search-result-item {
            display: flex;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 15px;
            overflow: hidden;
            background: white;
        }
        
        .result-image {
            position: relative;
            width: 100px;
            height: 100px;
            flex-shrink: 0;
        }
        
        .result-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .match-score {
            position: absolute;
            bottom: 5px;
            right: 5px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            font-size: 10px;
            padding: 3px 6px;
            border-radius: 10px;
        }
        
        .result-details {
            padding: 10px 15px;
            flex-grow: 1;
        }
        
        .result-details h4 {
            margin: 0 0 5px 0;
            font-size: 16px;
        }
        
        .result-details p {
            margin: 0 0 5px 0;
            font-size: 14px;
            color: #6b7280;
        }
        
        .view-item-btn {
            margin-top: 5px;
            padding: 5px 10px;
            font-size: 12px;
        }
        
        .searching {
            display: flex;
            align-items: center;
            font-style: italic;
            color: #6b7280;
        }
        
        .searching::before {
            content: '';
            display: inline-block;
            width: 16px;
            height: 16px;
            margin-right: 8px;
            border: 2px solid #6b7280;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 1s linear infinite;
        }
        
        .error {
            background-color: #fee2e2;
            color: #b91c1c;
            padding: 10px 15px;
            border-radius: 6px;
            margin-bottom: 15px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(styleEl);
}

// Initialize accurate image search when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing accurate image search');
    
    // Add improved styles
    addImprovedSearchStyles();
    
    // Initialize image search if the elements exist on the page
    if (document.getElementById('imageSearchBtn')) {
        // Initialize the accurate image search
        const accurateSearch = new AccurateImageSearch();
        
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
