function _rgbToColorName(r, g, b) {
    const named = [
        { name: 'Black',       r: 0,   g: 0,   b: 0   },
        { name: 'White',       r: 255, g: 255, b: 255  },
        { name: 'Gray',        r: 128, g: 128, b: 128  },
        { name: 'Light Gray',  r: 211, g: 211, b: 211  },
        { name: 'Dark Gray',   r: 64,  g: 64,  b: 64   },
        { name: 'Red',         r: 220, g: 20,  b: 20   },
        { name: 'Dark Red',    r: 139, g: 0,   b: 0    },
        { name: 'Orange',      r: 255, g: 165, b: 0    },
        { name: 'Yellow',      r: 255, g: 220, b: 0    },
        { name: 'Green',       r: 0,   g: 160, b: 0    },
        { name: 'Dark Green',  r: 0,   g: 100, b: 0    },
        { name: 'Teal',        r: 0,   g: 128, b: 128  },
        { name: 'Cyan',        r: 0,   g: 210, b: 210  },
        { name: 'Blue',        r: 0,   g: 80,  b: 200  },
        { name: 'Navy',        r: 0,   g: 0,   b: 128  },
        { name: 'Purple',      r: 128, g: 0,   b: 128  },
        { name: 'Violet',      r: 148, g: 0,   b: 211  },
        { name: 'Pink',        r: 255, g: 105, b: 180  },
        { name: 'Brown',       r: 139, g: 69,  b: 19   },
        { name: 'Tan',         r: 210, g: 180, b: 140  },
        { name: 'Beige',       r: 245, g: 245, b: 220  },
        { name: 'Gold',        r: 218, g: 165, b: 32   },
        { name: 'Silver',      r: 192, g: 192, b: 192  },
    ];
    let best = named[0], bestDist = Infinity;
    for (const c of named) {
        const d = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
        if (d < bestDist) { bestDist = d; best = c; }
    }
    return best.name;
}

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
        // Expand modal when analyzing
        document.querySelector('.image-search-modal-content')?.classList.add('has-results');

        try {
            // Step 1: Local pixel/hash analysis (fast, works offline)
            const analysisResults = await window.ImprovedImageAnalyzer.analyzeImage(this.selectedImage);
            console.log('Local image analysis results:', analysisResults);

            // Step 2: Cloud Vision analysis (semantic labels, brand detection)
            // Merges real Vision labels into analysisResults — improves search quality
            if (window.CloudVision && window.CloudVision.available) {
                try {
                    this.searchResults.innerHTML = '<p class="searching">Analyzing image...</p>';
                    const visionResults = await window.CloudVision.analyzeImage(this.selectedImage);
                    if (visionResults && visionResults.labelAnnotations && visionResults.labelAnnotations.length > 0) {
                        analysisResults.labelAnnotations = visionResults.labelAnnotations;
                        analysisResults.visionWebEntities = (visionResults.webDetection && visionResults.webDetection.webEntities) || [];
                        analysisResults.textAnnotations = visionResults.textAnnotations || [];

                        // Crop to the main object's bounding box so background doesn't
                        // pollute the fingerprint, color histogram, or color display.
                        const objects = visionResults.localizedObjectAnnotations || [];
                        let bboxApplied = false;
                        if (objects.length > 0) {
                            const verts = (objects[0].boundingPoly && objects[0].boundingPoly.normalizedVertices) || [];
                            if (verts.length >= 4) {
                                const xs = verts.map(v => v.x || 0);
                                const ys = verts.map(v => v.y || 0);
                                const bbox = {
                                    x1: Math.max(0, Math.min(...xs)),
                                    y1: Math.max(0, Math.min(...ys)),
                                    x2: Math.min(1, Math.max(...xs)),
                                    y2: Math.min(1, Math.max(...ys))
                                };
                                const area = (bbox.x2 - bbox.x1) * (bbox.y2 - bbox.y1);
                                // Only crop when bbox is a meaningful sub-region (5%–97% of image)
                                if (area > 0.05 && area < 0.97) {
                                    const cropped = await window.ImprovedImageAnalyzer.recomputeFeaturesFromBBox(this.selectedImage, bbox);
                                    if (cropped) {
                                        analysisResults.imageFingerprint  = cropped.fingerprint;
                                        analysisResults._colorHistogram   = cropped.colorHistogram;
                                        analysisResults.imagePropertiesAnnotation = {
                                            dominantColors: { colors: cropped.dominantColors }
                                        };
                                        bboxApplied = true;
                                    }
                                }
                            }
                        }
                        // Fall back to Vision's full-image colors if no valid bbox
                        if (!bboxApplied && visionResults.imagePropertiesAnnotation) {
                            analysisResults.imagePropertiesAnnotation = visionResults.imagePropertiesAnnotation;
                        }
                        console.log('Cloud Vision labels merged:', visionResults.labelAnnotations.length, 'labels', bboxApplied ? '(bbox crop applied)' : '');
                    } else {
                        console.warn('Cloud Vision returned empty labels:', visionResults);
                    }
                } catch (visionErr) {
                    console.error('Cloud Vision failed:', visionErr.message);
                }
            }

            // Display analysis results
            this.searchResults.innerHTML = '<p class="analysis-results">Image Analysis Complete</p>';
            this.displayAnalysisResults(analysisResults);

            // Find similar items based on the analysis
            const matchingItems = await window.ImprovedImageAnalyzer.findSimilarItems(analysisResults);

            // Display the results
            this.displaySearchResults(matchingItems, analysisResults);
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
                const sortedColors = colors
                    .filter(c => c.color)
                    .sort((a, b) => (b.pixelFraction || b.score || 0) - (a.pixelFraction || a.score || 0))
                    .slice(0, 6);
                colorsHtml = `
                    <div class="analysis-section">
                        <h4>Dominant Colors</h4>
                        <div class="color-container">
                            ${sortedColors.map(colorInfo => {
                                const r = Math.round(colorInfo.color.red || 0);
                                const g = Math.round(colorInfo.color.green || 0);
                                const b = Math.round(colorInfo.color.blue || 0);
                                const pct = colorInfo.pixelFraction ? Math.round(colorInfo.pixelFraction * 100) + '%' : '';
                                const name = _rgbToColorName(r, g, b);
                                return `<div class="color-swatch-wrap" title="${name}${pct ? ' · ' + pct : ''}">
                                    <div class="color-swatch" style="background-color: rgb(${r},${g},${b})"></div>
                                    <span class="color-label">${name}</span>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
        }

        // Material & Texture — extracted from Vision labels
        let materialsHtml = '';
        const MATERIAL_KEYWORDS = [
            'leather','fabric','metal','plastic','glass','wood','rubber','denim',
            'cotton','nylon','canvas','velvet','silk','wool','polyester','suede',
            'vinyl','foam','ceramic','paper','cardboard','stone','silver','gold',
            'stainless steel','aluminum','copper','brass','titanium','fur','mesh',
            'woven','knit','lace','synthetic','transparent','opaque','glossy','matte'
        ];
        const materialLabels = (analysisResults.labelAnnotations || [])
            .filter(l => MATERIAL_KEYWORDS.some(kw => l.description.toLowerCase().includes(kw)))
            .map(l => l.description);
        // Also pull high-confidence web entities (brand names)
        const brandEntities = (analysisResults.visionWebEntities || [])
            .filter(e => e.score >= 0.5 && e.description)
            .slice(0, 3)
            .map(e => e.description);
        const detailTags = [...new Set([...materialLabels, ...brandEntities])].slice(0, 6);
        if (detailTags.length > 0) {
            materialsHtml = `
                <div class="analysis-section">
                    <h4>Material & Details</h4>
                    <div class="label-container">
                        ${detailTags.map(tag => `<span class="label">${tag}</span>`).join('')}
                    </div>
                </div>
            `;
        }
        
        // Add the analysis results to the search results element
        const analysisHtml = `
            <div class="analysis-container">
                ${labelsHtml}
                ${colorsHtml}
                ${materialsHtml}
                <div class="analysis-section">
                    <h4>Similar Items</h4>
                </div>
            </div>
        `;
        
        // Render analysis into the dedicated analysis info area
        const analysisInfo = document.getElementById('analysisInfo');
        if (analysisInfo) {
            analysisInfo.innerHTML = analysisHtml;
        } else {
            this.searchResults.innerHTML += analysisHtml;
        }
    }

    displaySearchResults(items, analysisResults) {
        if (!items || items.length === 0) {
            this.searchResults.innerHTML += '<p class="no-results">No matching items found.</p>';
            return;
        }

        // Build a set of query label texts for fast intersection lookup
        const queryLabelTexts = new Set(
            ((analysisResults && analysisResults.labelAnnotations) || [])
                .map(l => l.description.toLowerCase())
        );

        const resultsHTML = items.map(item => {
            // Find which stored Vision labels match the query labels
            let matchedOnHtml = '';
            if (item.visionLabels && item.visionLabels.length > 0) {
                const matched = item.visionLabels
                    .filter(l => queryLabelTexts.has(l.description.toLowerCase()))
                    .slice(0, 4)
                    .map(l => l.description);
                if (matched.length > 0) {
                    matchedOnHtml = `<p class="matched-on">Matched on: ${matched.join(', ')}</p>`;
                }
            }

            return `
            <div class="search-result-item" data-id="${item.id}">
                <div class="result-image">
                    <img src="${item.image}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/100x100?text=No+Image'">
                    ${item.score ? `<div class="match-score">${Math.round(item.score * 100)}% match</div>` : ''}
                </div>
                <div class="result-details">
                    <h4>${item.title || 'Unnamed Item'}</h4>
                    <p>${item.category || 'Uncategorized'}</p>
                    <p>${item.location || 'Unknown location'}</p>
                    ${matchedOnHtml}
                </div>
            </div>`;
        }).join('');

        // Append results (don't replace the whole content to preserve the analysis results)
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results-list';
        resultsContainer.innerHTML = resultsHTML;
        this.searchResults.appendChild(resultsContainer);

        // Make entire card clickable
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', async () => {
                const itemId = item.dataset.id;
                try {
                    const docRef = firebase.firestore().collection('items').doc(itemId);
                    const doc = await docRef.get();
                    
                    if (doc.exists) {
                        const itemData = {
                            id: doc.id,
                            ...doc.data()
                        };
                        
                        // Close search modal and open item details
                        window.imageSearchModal.close();
                        openItemDetails(itemData);
                        
                        // When item details modal closes, re-open search modal
                        window._returnToImageSearch = true;
                    } else {
                        console.error('Item not found:', itemId);
                        alert('Item not found');
                    }
                } catch (error) {
                    console.error('Error getting item:', error);
                    alert('Error loading item details');
                }
            });
        });
    }
}

// Add improved CSS styles
function addImprovedSearchStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        /* Image search modal - auto-size, expands when results appear */
        .image-search-modal-content {
            max-width: 96vw !important;
            width: auto !important;
            min-width: 300px !important;
            max-height: 90vh !important;
            margin: 2vh auto !important;
            overflow-y: auto !important;
        }
        
        .image-search-modal-content.has-results {
            width: 96vw !important;
        }
        
        /* Top row: image preview + analysis side by side */
        .image-search-top {
            display: flex;
            gap: 1.5rem;
            margin-top: 0.5rem;
            flex-shrink: 0;
        }
        
        .image-search-preview {
            flex: 0 0 200px;
        }
        
        .image-search-preview .image-preview {
            height: 150px;
        }
        
        .image-search-preview .upload-actions {
            display: flex;
            gap: 0.5rem;
        }
        
        .image-search-preview .upload-actions .btn {
            flex: 1;
            font-size: 12px;
            padding: 6px 8px;
        }
        
        .analysis-info {
            flex: 1;
            min-width: 0;
        }
        
        /* Override default grid on search-results so it acts as a plain container */
        .image-search-modal-content > .search-results {
            display: block !important;
            margin-top: 0.5rem !important;
        }
        
        .analysis-container {
            background: #f9fafb;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        }
        
        .analysis-section {
            margin-bottom: 15px;
        }
        
        .analysis-section h4 {
            margin: 0 0 8px 0;
            font-size: 15px;
            color: #1f2937;
        }
        
        .label-container {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        
        .label {
            background-color: #e0f2fe;
            color: #0369a1;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
        }
        
        .color-container {
            display: flex;
            gap: 8px;
        }
        
        .color-swatch-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }

        .color-swatch {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid #e5e7eb;
            box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }

        .color-label {
            font-size: 10px;
            color: #6b7280;
            text-align: center;
            max-width: 48px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .search-results-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
            padding: 0;
            width: 100%;
        }
        
        .search-result-item {
            display: flex;
            flex-direction: column;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
            background: white;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            cursor: pointer;
        }
        
        .search-result-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .result-image {
            position: relative;
            width: 100%;
            height: 180px;
            flex-shrink: 0;
        }
        
        .result-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .match-score {
            position: absolute;
            bottom: 8px;
            left: 8px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 10px;
        }
        
        .result-details {
            padding: 10px 12px;
            flex-grow: 1;
        }
        
        .result-details h4 {
            margin: 0 0 4px 0;
            font-size: 14px;
            color: #1f2937;
        }
        
        .result-details p {
            margin: 0 0 4px 0;
            font-size: 13px;
            color: #6b7280;
        }

        .matched-on {
            font-size: 11px;
            color: #0369a1;
            font-style: italic;
            margin: 4px 0 0 0 !important;
        }

        .vision-warning {
            font-size: 12px;
            color: #92400e;
            background: #fef3c7;
            border: 1px solid #fcd34d;
            padding: 6px 10px;
            border-radius: 6px;
            margin-bottom: 8px;
        }

        .vision-ok {
            font-size: 12px;
            color: #065f46;
            background: #d1fae5;
            border: 1px solid #6ee7b7;
            padding: 6px 10px;
            border-radius: 6px;
            margin-bottom: 8px;
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
        
        /* Responsive fallback for small screens */
        @media (max-width: 640px) {
            .image-search-layout {
                flex-direction: column;
            }
            .image-search-left {
                flex: none;
            }
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
            const analysisInfo = document.getElementById('analysisInfo');
            if (analysisInfo) analysisInfo.innerHTML = '';
            document.querySelector('.image-search-modal-content')?.classList.remove('has-results');
            
            // Open the modal
            window.imageSearchModal.open();
        });
    }
});
