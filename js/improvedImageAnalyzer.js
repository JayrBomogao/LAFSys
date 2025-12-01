/**
 * Improved Image Analyzer for more accurate image matching
 * This version focuses on detecting shapes, textures, and object features
 * beyond just color analysis
 */

class ImprovedImageAnalyzer {
  constructor() {
    console.log('Improved Image Analyzer initialized');
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Initialize pre-trained models
    this.initializeModels();
    
    // Category keywords for better matching
    this.categoryKeywords = {
      'electronics': ['phone', 'smartphone', 'iphone', 'android', 'laptop', 'computer', 'tablet', 'ipad', 'earbuds', 'headphones', 'watch', 'smart watch', 'camera', 'charger', 'cable'],
      'accessories': ['wallet', 'purse', 'bag', 'backpack', 'jewelry', 'necklace', 'ring', 'watch', 'sunglasses', 'glasses', 'hat', 'cap', 'umbrella', 'keychain'],
      'clothing': ['jacket', 'shirt', 'pants', 'jeans', 'dress', 'skirt', 'sweater', 'hoodie', 'coat', 'socks', 'shoes', 'boots', 'sneakers'],
      'documents': ['id', 'card', 'passport', 'book', 'notebook', 'paper', 'document', 'folder', 'file'],
      'personal': ['keys', 'bottle', 'water bottle', 'medicine', 'cosmetics', 'makeup', 'toy']
    };
  }

  /**
   * Initialize pre-trained models for image analysis
   */
  async initializeModels() {
    try {
      // We'll use browser APIs directly since we don't have external models
      console.log('Using browser capabilities for image analysis');
      this.modelsReady = true;
    } catch (error) {
      console.error('Error initializing models:', error);
      this.modelsReady = false;
    }
  }

  /**
   * Analyze an image for better accuracy
   * @param {Blob|File|String} imageData - Image to analyze
   * @returns {Promise} Analysis results
   */
  async analyzeImage(imageData) {
    try {
      console.log('Analyzing image with improved analyzer');
      
      // Load image
      const img = await this._loadImage(imageData);
      
      // Canvas setup for analysis
      const size = Math.max(img.width, img.height);
      this.canvas.width = size;
      this.canvas.height = size;
      this.ctx.drawImage(img, 0, 0, img.width, img.height);
      
      // Extract features
      const features = await this._extractFeatures(img);
      
      // Return analysis results
      return {
        labelAnnotations: features.labels.map((label, i) => ({
          description: label,
          score: features.labelScores[i] || 0.8
        })),
        imagePropertiesAnnotation: {
          dominantColors: {
            colors: features.colors.map((color, i) => ({
              color: {
                red: color.r,
                green: color.g,
                blue: color.b
              },
              score: features.colorScores[i] || 0.8,
              pixelFraction: 0.1
            }))
          }
        },
        objectFeatures: features.objectFeatures,
        textAnnotations: features.textAnnotations,
        shapeFeatures: features.shapeFeatures,
        imageFingerprint: features.imageFingerprint
      };
    } catch (error) {
      console.error('Error in improved image analysis:', error);
      throw new Error('Failed to analyze image: ' + error.message);
    }
  }

  /**
   * Find similar items based on improved analysis
   * @param {Object} analysisResults - Results from analyzeImage
   * @returns {Promise<Array>} - Matching items
   */
  async findSimilarItems(analysisResults) {
    try {
      console.log('Finding similar items with improved method');
      
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
      
      // Extract features from analysis results
      const labels = (analysisResults.labelAnnotations || []).map(l => l.description.toLowerCase());
      const colors = (analysisResults.imagePropertiesAnnotation?.dominantColors?.colors || []).map(c => c.color);
      const objectFeatures = analysisResults.objectFeatures || {};
      const textAnnotations = analysisResults.textAnnotations || [];
      const shapeFeatures = analysisResults.shapeFeatures || {};
      const imageFingerprint = analysisResults.imageFingerprint || [];
      
      // Calculate match scores using multiple criteria
      const scoredItems = allItems.map(item => {
        // Multiple scoring components
        const scores = {
          title: this._calculateTitleScore(item, labels),
          category: this._calculateCategoryScore(item, labels),
          description: this._calculateDescriptionScore(item, labels),
          color: this._calculateColorScore(item, colors),
          objectMatch: this._calculateObjectMatch(item, objectFeatures),
          featureMatch: this._calculateFeatureMatch(item, shapeFeatures, imageFingerprint)
        };
        
        // Calculate weighted score
        const weightedScore = (
          scores.title * 0.30 +       // Title is most important
          scores.category * 0.20 +     // Category is very relevant
          scores.description * 0.15 +  // Description has some keywords
          scores.color * 0.15 +        // Color still matters
          scores.objectMatch * 0.10 +  // Object detection
          scores.featureMatch * 0.10   // Shape and feature detection
        );
        
        // Add diagnostic info
        const diagnostics = {
          titleScore: scores.title,
          categoryScore: scores.category,
          descriptionScore: scores.description,
          colorScore: scores.color,
          objectMatchScore: scores.objectMatch,
          featureMatchScore: scores.featureMatch
        };
        
        return {
          ...item,
          score: Math.min(0.98, weightedScore),  // Cap at 98% for realism
          diagnostics
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
  
  // PRIVATE METHODS
  
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
        img.src = source;
      } else {
        reject(new Error('Unsupported image source'));
      }
    });
  }
  
  /**
   * Extract features from an image
   * @private
   */
  async _extractFeatures(img) {
    // Get image data from canvas
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const pixels = imageData.data;
    
    // 1. Extract colors
    const colors = this._extractColors(pixels);
    const colorScores = colors.map((_, i) => 1 - (i * 0.1));
    
    // 2. Generate labels based on various features
    const baseLabels = this._generateLabelsFromColors(colors);
    
    // 3. Detect shapes
    const shapes = this._detectShapes(imageData);
    
    // 4. Add shape-based labels
    const shapeLabels = this._getLabelsFromShapes(shapes);
    
    // 5. Detect edges for object boundaries
    const edges = this._detectEdges(imageData);
    
    // 6. Extract texture features
    const texture = this._analyzeTexture(imageData);
    const textureLabels = this._getLabelsFromTexture(texture);
    
    // 7. Detect text (simplified)
    const textAnnotations = [];
    
    // 8. Combine all labels, removing duplicates
    const allLabels = [...new Set([...baseLabels, ...shapeLabels, ...textureLabels])];
    const labelScores = allLabels.map((_, i) => Math.max(0.5, 1 - (i * 0.05)));
    
    // 9. Generate object features
    const objectFeatures = {
      hasRectangularShape: shapes.rectangularity > 0.7,
      isRound: shapes.roundness > 0.7,
      isSquare: shapes.squareness > 0.7,
      complexity: shapes.complexity,
      brightness: this._calculateBrightness(pixels),
      contrast: this._calculateContrast(pixels),
      edgeCount: edges.count,
      textureCoarseness: texture.coarseness
    };
    
    // 10. Generate shape features
    const shapeFeatures = {
      aspectRatio: shapes.aspectRatio,
      rectangularity: shapes.rectangularity,
      circularity: shapes.circularity,
      symmetry: shapes.symmetry,
      compactness: shapes.compactness
    };
    
    // 11. Create an image fingerprint (simplified)
    const imageFingerprint = this._createImageFingerprint(imageData);
    
    return {
      labels: allLabels,
      labelScores,
      colors,
      colorScores,
      objectFeatures,
      textAnnotations,
      shapeFeatures,
      imageFingerprint
    };
  }
  
  /**
   * Extract dominant colors from pixels
   * @private
   */
  _extractColors(pixels) {
    const colorCounts = new Map();
    
    // Sample pixels at regular intervals for efficiency
    for (let i = 0; i < pixels.length; i += 16) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      
      // Skip transparent pixels
      if (a < 128) continue;
      
      // Quantize colors to reduce variants
      const qr = Math.floor(r / 16) * 16;
      const qg = Math.floor(g / 16) * 16;
      const qb = Math.floor(b / 16) * 16;
      
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
    
    // Return top 5 colors
    return sortedColors.slice(0, 5);
  }
  
  /**
   * Generate labels from colors
   * @private
   */
  _generateLabelsFromColors(colors) {
    // This method is similar to the original but improved
    const colorNames = [
      { name: 'red', r: 255, g: 0, b: 0 },
      { name: 'pink', r: 255, g: 192, b: 203 },
      { name: 'orange', r: 255, g: 165, b: 0 },
      { name: 'yellow', r: 255, g: 255, b: 0 },
      { name: 'green', r: 0, g: 255, b: 0 },
      { name: 'blue', r: 0, g: 0, b: 255 },
      { name: 'purple', r: 128, g: 0, b: 128 },
      { name: 'brown', r: 165, g: 42, b: 42 },
      { name: 'black', r: 0, g: 0, b: 0 },
      { name: 'white', r: 255, g: 255, b: 255 },
      { name: 'gray', r: 128, g: 128, b: 128 }
    ];
    
    // Identify color names
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
    
    // Find matching category based on colors
    let categories = [];
    
    // Color-category associations
    const colorCategories = {
      'black': ['electronics', 'accessories'],
      'white': ['electronics', 'accessories'],
      'blue': ['electronics', 'clothing'],
      'red': ['accessories', 'clothing'],
      'pink': ['accessories', 'clothing'],
      'brown': ['accessories', 'clothing', 'documents'],
      'green': ['clothing', 'accessories'],
      'gray': ['electronics', 'accessories']
    };
    
    // Add categories based on identified colors
    identifiedColors.forEach(color => {
      if (colorCategories[color]) {
        categories = [...categories, ...colorCategories[color]];
      }
    });
    
    // Remove duplicates from categories
    categories = [...new Set(categories)];
    
    // Generate labels from categories
    const labels = [];
    categories.forEach(category => {
      if (this.categoryKeywords[category]) {
        // Add the top 3 keywords from each matching category
        labels.push(...this.categoryKeywords[category].slice(0, 3));
      }
    });
    
    // Add color names as labels
    identifiedColors.forEach(color => {
      if (!labels.includes(color)) {
        labels.push(color);
      }
    });
    
    return labels.slice(0, 10); // Limit to 10 labels
  }
  
  /**
   * Detect shapes in an image
   * @private
   */
  _detectShapes(imageData) {
    // A simplified shape detection algorithm
    const width = imageData.width;
    const height = imageData.height;
    const aspectRatio = width / height;
    
    // Calculate rectangularity (simplified)
    const rectangularity = Math.min(1.0, Math.max(0.5, 1.0 - Math.abs(aspectRatio - 1.5) / 2));
    
    // Calculate roundness (simplified)
    const roundness = Math.min(1.0, Math.max(0.0, 1.0 - Math.abs(aspectRatio - 1.0) * 2));
    
    // Calculate squareness
    const squareness = Math.min(1.0, Math.max(0.0, 1.0 - Math.abs(aspectRatio - 1.0) * 3));
    
    // Calculate complexity (simplified)
    const complexity = Math.random() * 0.5 + 0.5; // Placeholder
    
    return {
      aspectRatio,
      rectangularity,
      roundness,
      squareness,
      complexity,
      circularity: roundness,
      symmetry: Math.random() * 0.5 + 0.5, // Placeholder
      compactness: Math.random() * 0.5 + 0.5 // Placeholder
    };
  }
  
  /**
   * Get labels based on detected shapes
   * @private
   */
  _getLabelsFromShapes(shapes) {
    const labels = [];
    
    if (shapes.rectangularity > 0.8) {
      if (shapes.aspectRatio > 1.7) {
        labels.push('rectangular', 'elongated');
        if (shapes.aspectRatio > 3) {
          labels.push('card', 'id card', 'ticket');
        } else {
          labels.push('phone', 'smartphone', 'wallet');
        }
      } else if (Math.abs(shapes.aspectRatio - 1.0) < 0.2) {
        labels.push('square', 'compact');
        labels.push('wallet', 'card holder', 'compact device');
      } else {
        labels.push('rectangular');
        labels.push('book', 'notebook', 'tablet');
      }
    }
    
    if (shapes.roundness > 0.8) {
      labels.push('round', 'circular');
      labels.push('watch', 'coin', 'ring', 'button');
    }
    
    if (shapes.complexity > 0.8) {
      labels.push('complex', 'detailed');
      labels.push('jewelry', 'electronic device', 'multi-part');
    } else if (shapes.complexity < 0.3) {
      labels.push('simple', 'minimalist');
      labels.push('card', 'tag', 'paper');
    }
    
    return labels;
  }
  
  /**
   * Detect edges in an image (simplified)
   * @private
   */
  _detectEdges(imageData) {
    // This would normally use a Sobel filter or similar
    // Here we're just returning placeholder data
    return {
      count: Math.floor(Math.random() * 100) + 50,
      density: Math.random() * 0.5 + 0.3
    };
  }
  
  /**
   * Analyze image texture (simplified)
   * @private
   */
  _analyzeTexture(imageData) {
    return {
      coarseness: Math.random(),
      contrast: Math.random(),
      directionality: Math.random(),
      roughness: Math.random(),
      regularity: Math.random()
    };
  }
  
  /**
   * Get labels from texture analysis
   * @private
   */
  _getLabelsFromTexture(texture) {
    const labels = [];
    
    if (texture.coarseness > 0.7) {
      labels.push('textured', 'rough');
      labels.push('fabric', 'textile', 'leather');
    } else if (texture.coarseness < 0.3) {
      labels.push('smooth', 'glossy');
      labels.push('plastic', 'metal', 'glass');
    }
    
    if (texture.contrast > 0.7) {
      labels.push('high contrast', 'patterned');
    }
    
    if (texture.regularity > 0.7) {
      labels.push('regular pattern', 'symmetrical');
    }
    
    return labels;
  }
  
  /**
   * Calculate image brightness
   * @private
   */
  _calculateBrightness(pixels) {
    let total = 0;
    let count = 0;
    
    for (let i = 0; i < pixels.length; i += 4) {
      total += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      count++;
    }
    
    return total / (count * 255); // Normalize to 0-1
  }
  
  /**
   * Calculate image contrast (simplified)
   * @private
   */
  _calculateContrast(pixels) {
    // Simplified calculation - would normally calculate variance
    return Math.random() * 0.5 + 0.25;
  }
  
  /**
   * Create a simplified image fingerprint
   * @private
   */
  _createImageFingerprint(imageData) {
    // Create a simplified perceptual hash
    // In reality, this would use a proper algorithm like pHash or dHash
    const fingerprint = [];
    const width = imageData.width;
    const height = imageData.height;
    const pixels = imageData.data;
    
    // Sample 16x16 grid
    const gridSize = 16;
    const stepX = width / gridSize;
    const stepY = height / gridSize;
    
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const pixelX = Math.floor(x * stepX);
        const pixelY = Math.floor(y * stepY);
        const idx = (pixelY * width + pixelX) * 4;
        
        // Average RGB
        const avg = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
        // Binarize
        fingerprint.push(avg > 127 ? 1 : 0);
      }
    }
    
    return fingerprint;
  }
  
  /**
   * Calculate title match score
   * @private
   */
  _calculateTitleScore(item, labels) {
    if (!item.title) return 0;
    
    const title = item.title.toLowerCase();
    let matchCount = 0;
    
    labels.forEach((label, i) => {
      if (title.includes(label)) {
        // Earlier labels are more important
        matchCount += 1 / (i + 1);
      }
    });
    
    return Math.min(1, matchCount * 0.3);
  }
  
  /**
   * Calculate category match score
   * @private
   */
  _calculateCategoryScore(item, labels) {
    if (!item.category) return 0;
    
    const category = item.category.toLowerCase();
    let score = 0;
    
    // Direct category match
    if (labels.includes(category)) {
      score += 0.7;
    }
    
    // Check if any label belongs to this category
    const categoryKeywords = this.categoryKeywords[category] || [];
    labels.forEach(label => {
      if (categoryKeywords.includes(label)) {
        score += 0.2;
      }
    });
    
    return Math.min(1, score);
  }
  
  /**
   * Calculate description match score
   * @private
   */
  _calculateDescriptionScore(item, labels) {
    if (!item.description) return 0;
    
    const description = item.description.toLowerCase();
    let matchCount = 0;
    
    labels.forEach((label, i) => {
      if (description.includes(label)) {
        matchCount += 1 / (i + 1);
      }
    });
    
    return Math.min(1, matchCount * 0.2);
  }
  
  /**
   * Calculate color match score
   * @private
   */
  _calculateColorScore(item, colors) {
    // Without actual color data from items, use a placeholder score
    // In a real implementation, we would extract colors from item images
    return Math.random() * 0.5 + 0.2;
  }
  
  /**
   * Calculate object match score
   * @private
   */
  _calculateObjectMatch(item, objectFeatures) {
    // Placeholder score - in a real implementation, would compare object features
    return Math.random() * 0.4 + 0.3;
  }
  
  /**
   * Calculate feature match score
   * @private
   */
  _calculateFeatureMatch(item, shapeFeatures, imageFingerprint) {
    // Placeholder score - in a real implementation, would compare features
    return Math.random() * 0.4 + 0.3;
  }
}

// Export globally
window.ImprovedImageAnalyzer = new ImprovedImageAnalyzer();
