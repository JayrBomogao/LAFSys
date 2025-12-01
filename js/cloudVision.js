/**
 * Google Cloud Vision API integration for LAFSys
 * This file provides functions to analyze images using Google Cloud Vision API
 */

// Cloud Vision API Helper Class
class CloudVisionHelper {
    constructor() {
        console.log('Cloud Vision Helper initialized');
        // Check if Firebase is available
        if (!firebase || !firebase.functions) {
            console.error('Firebase functions not available');
            this.available = false;
        } else {
            this.available = true;
            // Initialize Firebase Functions
            this.functions = firebase.functions();
        }
    }

    /**
     * Analyze an image using Google Cloud Vision API
     * @param {string|Blob} imageData - The image data (URL, Blob, or Base64)
     * @returns {Promise<Object>} - The analysis results
     */
    async analyzeImage(imageData) {
        if (!this.available) {
            console.error('Cloud Vision Helper not available');
            throw new Error('Cloud Vision integration not available');
        }

        try {
            console.log('Preparing image for Cloud Vision analysis');
            let imageBase64;

            // Convert image to base64 if it's a blob or file
            if (imageData instanceof Blob) {
                imageBase64 = await this._blobToBase64(imageData);
            } else if (typeof imageData === 'string') {
                // If it's a data URL, extract the base64 part
                if (imageData.startsWith('data:image')) {
                    imageBase64 = imageData.split(',')[1];
                } else {
                    // If it's a regular URL, we'll need to fetch it first
                    const response = await fetch(imageData);
                    const blob = await response.blob();
                    imageBase64 = await this._blobToBase64(blob);
                }
            } else {
                throw new Error('Invalid image format');
            }

            console.log('Image prepared, calling Cloud Vision API');
            
            // Call the Cloud Function
            const analyzeImageFunction = this.functions.httpsCallable('analyzeImage');
            const result = await analyzeImageFunction({ image: imageBase64 });
            
            console.log('Cloud Vision analysis complete', result);
            return result.data;
        } catch (error) {
            console.error('Error analyzing image:', error);
            throw error;
        }
    }

    /**
     * Search for similar items based on image analysis
     * @param {Object} analysisResults - The analysis results from Cloud Vision
     * @returns {Promise<Array>} - Array of matching items
     */
    async findSimilarItems(analysisResults) {
        if (!this.available) {
            throw new Error('Cloud Vision integration not available');
        }

        try {
            console.log('Searching for similar items based on analysis');
            
            // Extract labels, objects, and colors from the analysis
            const labels = this._extractLabels(analysisResults);
            const colors = this._extractColors(analysisResults);
            
            console.log('Extracted search terms:', { labels, colors });
            
            // Get all items from Firestore
            const querySnapshot = await firebase.firestore().collection('items').get();
            const allItems = [];
            querySnapshot.forEach(doc => {
                allItems.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Calculate similarity scores for each item
            const itemsWithScores = this._calculateSimilarityScores(allItems, labels, colors);
            
            // Sort by similarity score (descending)
            itemsWithScores.sort((a, b) => b.score - a.score);
            
            // Return the top 5 items or all if less than 5
            return itemsWithScores.slice(0, 5).map(item => item.item);
        } catch (error) {
            console.error('Error finding similar items:', error);
            throw error;
        }
    }

    /**
     * Convert a Blob to Base64 string
     * @private
     */
    _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = () => reject(new Error('Failed to convert image to base64'));
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Extract labels from the analysis results
     * @private
     */
    _extractLabels(analysisResults) {
        const labels = [];
        
        // Extract from labelAnnotations
        if (analysisResults.labelAnnotations) {
            analysisResults.labelAnnotations.forEach(label => {
                labels.push({
                    text: label.description,
                    score: label.score || 0
                });
            });
        }
        
        // Extract from localizedObjectAnnotations
        if (analysisResults.localizedObjectAnnotations) {
            analysisResults.localizedObjectAnnotations.forEach(obj => {
                labels.push({
                    text: obj.name,
                    score: obj.score || 0
                });
            });
        }
        
        return labels;
    }

    /**
     * Extract color information from the analysis results
     * @private
     */
    _extractColors(analysisResults) {
        const colors = [];
        
        // Extract from imagePropertiesAnnotation
        if (analysisResults.imagePropertiesAnnotation && 
            analysisResults.imagePropertiesAnnotation.dominantColors &&
            analysisResults.imagePropertiesAnnotation.dominantColors.colors) {
                
            analysisResults.imagePropertiesAnnotation.dominantColors.colors.forEach(color => {
                const { red, green, blue } = color.color;
                colors.push({
                    rgb: { red, green, blue },
                    score: color.score || 0
                });
            });
        }
        
        return colors;
    }

    /**
     * Calculate similarity scores for items based on labels and colors
     * @private
     */
    _calculateSimilarityScores(items, labels, colors) {
        return items.map(item => {
            let score = 0;
            
            // Check for label matches in title, description, and category
            labels.forEach(label => {
                const labelLower = label.text.toLowerCase();
                if (item.title && item.title.toLowerCase().includes(labelLower)) {
                    score += 2 * label.score; // Title match is more important
                }
                if (item.description && item.description.toLowerCase().includes(labelLower)) {
                    score += 1 * label.score;
                }
                if (item.category && item.category.toLowerCase().includes(labelLower)) {
                    score += 1.5 * label.score;
                }
            });
            
            // TODO: Color matching could be implemented here
            // This would require color extraction from item images
            
            return {
                item,
                score
            };
        });
    }
}

// Initialize the Cloud Vision Helper
const cloudVision = new CloudVisionHelper();

// Export globally
window.CloudVision = cloudVision;
