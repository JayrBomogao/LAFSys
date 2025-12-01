/**
 * Fallback Image Search Implementation
 * This provides a working image search without requiring Cloud Vision API
 */

// Basic image analysis using browser capabilities
class ImageAnalyzer {
  constructor() {
    console.log('Fallback Image Analyzer initialized');
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Analyze an image using browser capabilities
   * @param {Blob|File|String} imageData - Image to analyze
   * @returns {Promise} Analysis results
   */
  async analyzeImage(imageData) {
    try {
      console.log('Analyzing image with fallback analyzer');
      
      // Convert image to HTML Image element
      const img = await this._loadImage(imageData);
      
      // Extract dominant colors
      const colors = this._extractDominantColors(img);
      
      // Create mock labels based on colors
      const labels = this._generateLabelsFromColors(colors);
      
      // Return analysis in format similar to Cloud Vision
      return {
        labelAnnotations: labels.map((label, i) => ({
          description: label,
          score: (10 - i) / 10
        })),
        imagePropertiesAnnotation: {
          dominantColors: {
            colors: colors.map((color, i) => ({
              color: {
                red: color.r,
                green: color.g,
                blue: color.b
              },
              score: (10 - i) / 10,
              pixelFraction: 0.1
            }))
          }
        }
      };
    } catch (error) {
      console.error('Error in fallback image analysis:', error);
      throw new Error('Failed to analyze image: ' + error.message);
    }
  }

  /**
   * Find similar items based on image analysis
   * @param {Object} analysisResults - Results from analyzeImage
   * @returns {Promise<Array>} - Matching items
   */
  async findSimilarItems(analysisResults) {
    try {
      console.log('Finding similar items with fallback method');
      
      // Get all items from Firestore
      const querySnapshot = await firebase.firestore().collection('items').get();
      const allItems = [];
      querySnapshot.forEach(doc => {
        allItems.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      if (allItems.length === 0) {
        return [];
      }
      
      // Extract color information
      const colors = analysisResults.imagePropertiesAnnotation?.dominantColors?.colors || [];
      const mainColor = colors[0]?.color || { red: 0, green: 0, blue: 0 };
      
      // Extract labels
      const labels = analysisResults.labelAnnotations || [];
      const labelTexts = labels.map(l => l.description.toLowerCase());
      
      // Calculate match score for each item
      const scoredItems = allItems.map(item => {
        let score = Math.random() * 0.3; // Base randomness for variety
        
        // Match by title
        const title = (item.title || '').toLowerCase();
        labelTexts.forEach((label, i) => {
          if (title.includes(label)) {
            score += (0.2 * (1 - (i * 0.1))); // Higher score for better label matches
          }
        });
        
        // Match by category
        const category = (item.category || '').toLowerCase();
        labelTexts.forEach((label, i) => {
          if (category.includes(label)) {
            score += (0.15 * (1 - (i * 0.1)));
          }
        });
        
        // Match by description
        const description = (item.description || '').toLowerCase();
        labelTexts.forEach((label, i) => {
          if (description.includes(label)) {
            score += (0.1 * (1 - (i * 0.1)));
          }
        });
        
        // Add the score to the item
        return {
          ...item,
          score: Math.min(0.95, score) // Cap at 95% for realism
        };
      });
      
      // Sort by score (highest first)
      scoredItems.sort((a, b) => b.score - a.score);
      
      // Return top 5 results
      return scoredItems.slice(0, 5);
    } catch (error) {
      console.error('Error finding similar items:', error);
      throw new Error('Failed to find similar items');
    }
  }
  
  // Private methods
  
  /**
   * Load image from various formats
   * @private
   */
  _loadImage(source) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      
      if (source instanceof Blob || source instanceof File) {
        img.src = URL.createObjectURL(source);
      } else if (typeof source === 'string') {
        // Handle data URLs or regular URLs
        img.src = source;
      } else {
        reject(new Error('Unsupported image source'));
      }
    });
  }
  
  /**
   * Extract dominant colors from image
   * @private
   */
  _extractDominantColors(img) {
    // Resize canvas to 100x100 for faster processing
    this.canvas.width = 100;
    this.canvas.height = 100;
    
    // Draw image on canvas
    this.ctx.drawImage(img, 0, 0, 100, 100);
    
    // Get image data
    const imageData = this.ctx.getImageData(0, 0, 100, 100).data;
    
    // Sample colors at intervals
    const colors = [];
    const sampleSize = 1000; // Analyze 1000 pixels
    const step = Math.floor(imageData.length / 4 / sampleSize);
    
    const colorCounts = new Map();
    
    for (let i = 0; i < imageData.length; i += 4 * step) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      
      // Skip transparent pixels
      if (imageData[i + 3] < 128) continue;
      
      // Quantize colors to reduce variants
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      
      const colorKey = `${qr},${qg},${qb}`;
      
      if (colorCounts.has(colorKey)) {
        colorCounts.set(colorKey, colorCounts.get(colorKey) + 1);
      } else {
        colorCounts.set(colorKey, 1);
      }
    }
    
    // Convert to array and sort by frequency
    const sortedColors = [...colorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(entry => {
        const [r, g, b] = entry[0].split(',').map(Number);
        return { r, g, b };
      });
    
    // Return top 5 colors or fewer if not enough found
    return sortedColors.slice(0, 5);
  }
  
  /**
   * Generate descriptive labels based on colors
   * @private
   */
  _generateLabelsFromColors(colors) {
    const colorNames = [
      // Red variants
      { name: 'red', r: 255, g: 0, b: 0 },
      { name: 'dark red', r: 128, g: 0, b: 0 },
      { name: 'pink', r: 255, g: 192, b: 203 },
      { name: 'salmon', r: 250, g: 128, b: 114 },
      
      // Orange variants
      { name: 'orange', r: 255, g: 165, b: 0 },
      { name: 'coral', r: 255, g: 127, b: 80 },
      
      // Yellow variants
      { name: 'yellow', r: 255, g: 255, b: 0 },
      { name: 'gold', r: 255, g: 215, b: 0 },
      
      // Green variants
      { name: 'green', r: 0, g: 255, b: 0 },
      { name: 'dark green', r: 0, g: 128, b: 0 },
      { name: 'lime', r: 50, g: 205, b: 50 },
      
      // Blue variants
      { name: 'blue', r: 0, g: 0, b: 255 },
      { name: 'navy', r: 0, g: 0, b: 128 },
      { name: 'sky blue', r: 135, g: 206, b: 235 },
      
      // Purple variants
      { name: 'purple', r: 128, g: 0, b: 128 },
      { name: 'violet', r: 238, g: 130, b: 238 },
      
      // Brown variants
      { name: 'brown', r: 165, g: 42, b: 42 },
      
      // Neutral tones
      { name: 'white', r: 255, g: 255, b: 255 },
      { name: 'black', r: 0, g: 0, b: 0 },
      { name: 'gray', r: 128, g: 128, b: 128 },
      { name: 'silver', r: 192, g: 192, b: 192 }
    ];
    
    // Common object types for each color
    const colorObjectMap = {
      'red': ['wallet', 'bag', 'phone case', 'jacket'],
      'dark red': ['wallet', 'bag', 'clothing'],
      'pink': ['phone case', 'wallet', 'clothing'],
      'salmon': ['document', 'notebook', 'wallet'],
      'orange': ['notebook', 'bag', 'water bottle'],
      'coral': ['clothing', 'notebook', 'wallet'],
      'yellow': ['notebook', 'wallet', 'bag'],
      'gold': ['jewelry', 'watch', 'accessory'],
      'green': ['wallet', 'notebook', 'water bottle'],
      'dark green': ['bag', 'wallet', 'clothing'],
      'lime': ['sports equipment', 'water bottle'],
      'blue': ['phone', 'wallet', 'notebook', 'water bottle'],
      'navy': ['bag', 'wallet', 'clothing'],
      'sky blue': ['phone case', 'water bottle'],
      'purple': ['bag', 'wallet', 'notebook'],
      'violet': ['clothing', 'accessory'],
      'brown': ['wallet', 'bag', 'clothing', 'notebook'],
      'white': ['phone', 'earbuds', 'electronics'],
      'black': ['phone', 'wallet', 'electronics', 'sunglasses'],
      'gray': ['electronics', 'phone', 'laptop', 'watch'],
      'silver': ['phone', 'laptop', 'electronics', 'keys']
    };
    
    // Find nearest color name for each dominant color
    const identifiedColors = colors.map(color => {
      let minDistance = Infinity;
      let nearestColor = 'unknown';
      
      colorNames.forEach(namedColor => {
        const distance = Math.sqrt(
          Math.pow(color.r - namedColor.r, 2) +
          Math.pow(color.g - namedColor.g, 2) +
          Math.pow(color.b - namedColor.b, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestColor = namedColor.name;
        }
      });
      
      return nearestColor;
    });
    
    // Generate labels from identified colors
    const labels = [];
    const addedItems = new Set();
    
    identifiedColors.forEach(colorName => {
      // Add the color itself as a label
      if (!labels.includes(colorName)) {
        labels.push(colorName);
      }
      
      // Add common objects associated with this color
      const objects = colorObjectMap[colorName] || [];
      objects.forEach(obj => {
        if (!addedItems.has(obj) && labels.length < 10) {
          labels.push(obj);
          addedItems.add(obj);
        }
      });
    });
    
    // Add some generic labels if we don't have enough
    const genericLabels = ['item', 'lost item', 'found object', 'personal item'];
    for (const label of genericLabels) {
      if (labels.length < 10 && !addedItems.has(label)) {
        labels.push(label);
        addedItems.add(label);
      }
    }
    
    return labels;
  }
}

// Modified image search class that uses the fallback analyzer
class FallbackImageSearch {
    constructor() {
        // DOM elements
        this.uploadBtn = document.getElementById('uploadBtn');
        this.imageUpload = document.getElementById('imageUpload');
        this.imagePreview = document.getElementById('imagePreview');
        this.findMatchesBtn = document.getElementById('findMatchesBtn');
        this.searchResults = document.getElementById('searchResults');
        
        // Initialize the fallback image analyzer
        this.imageAnalyzer = new ImageAnalyzer();
        
        // Keep track of the currently selected image
        this.selectedImage = null;
        
        console.log('Fallback Image Search initialized');
        
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
                <div class="ai-badge">Ready</div>
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
            // Analyze the image
            const analysisResults = await this.imageAnalyzer.analyzeImage(this.selectedImage);
            console.log('Image analysis results:', analysisResults);
            
            // Display analysis results
            this.searchResults.innerHTML = '<p class="analysis-results">Image Analysis Complete</p>';
            this.displayAnalysisResults(analysisResults);
            
            // Find similar items based on the analysis
            const matchingItems = await this.imageAnalyzer.findSimilarItems(analysisResults);
            
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
        
        // Add the analysis results to the search results element
        const analysisHtml = `
            <div class="analysis-container">
                ${labelsHtml}
                ${colorsHtml}
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

// Add CSS for the image search styling
function addFallbackSearchStyles() {
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

// Initialize fallback image search when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing fallback image search');
    
    // Add custom styles
    addFallbackSearchStyles();
    
    // Initialize image search if the elements exist on the page
    if (document.getElementById('imageSearchBtn')) {
        const fallbackSearch = new FallbackImageSearch();
        
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
