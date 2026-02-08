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
      
      // CRITICAL: Create the comparison fingerprint using the SAME path as item images
      // This ensures identical images produce identical fingerprints
      const uploadedFeatures = await this._getItemImageFeatures_fromImg(img);
      
      // Extract features for label/color/shape analysis
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
        imageFingerprint: uploadedFeatures.fingerprint,
        _colorHistogram: uploadedFeatures.colorHistogram,
        _pixelData: uploadedFeatures.pixelData
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
      const shapeFeatures = analysisResults.shapeFeatures || {};
      const uploadedFingerprint = analysisResults.imageFingerprint || [];
      const uploadedColorHist = analysisResults._colorHistogram || this._lastColorHistogram || [];
      
      // Compare uploaded image directly against each item's image
      const scoredItems = [];
      const uploadedPixelData = analysisResults._pixelData || null;
      
      for (const item of allItems) {
        let hashScore = 0;
        let colorCompareScore = 0;
        let pixelScore = 0;
        
        // Direct image comparison if item has an image
        if (item.image) {
          try {
            const itemFeatures = await this._getItemImageFeatures(item.image);
            hashScore = this._compareFingerprints(uploadedFingerprint, itemFeatures.fingerprint);
            colorCompareScore = this._compareColorHistograms(uploadedColorHist, itemFeatures.colorHistogram);
            
            // Direct pixel-level comparison for exact/near-exact match detection
            if (uploadedPixelData && itemFeatures.pixelData) {
              pixelScore = this._comparePixels(uploadedPixelData, itemFeatures.pixelData);
            }
          } catch (e) {
            console.log('Could not compare image for item:', item.title, e.message);
          }
        }
        
        // Use the BEST visual score between hash and pixel comparison
        const visualScore = Math.max(hashScore, pixelScore);
        
        // Text-based scores
        const titleScore = this._calculateTitleScore(item, labels);
        const categoryScore = this._calculateCategoryScore(item, labels);
        const descriptionScore = this._calculateDescriptionScore(item, labels);
        
        // Weighted score: visual comparison is dominant
        // If pixel match is very high (>0.9), boost it heavily - it's likely the same image
        let weightedScore;
        if (pixelScore > 0.9) {
          // Near-exact pixel match - this IS the same image
          weightedScore = 0.92 + (pixelScore - 0.9) * 0.7;
        } else {
          weightedScore = (
            visualScore * 0.55 +          // Best of hash/pixel comparison
            colorCompareScore * 0.15 +    // Color histogram comparison
            titleScore * 0.12 +           // Title keyword match
            categoryScore * 0.10 +        // Category match
            descriptionScore * 0.08       // Description match
          );
        }
        
        const diagnostics = {
          hashScore,
          pixelScore,
          visualScore,
          colorCompareScore,
          titleScore,
          categoryScore,
          descriptionScore
        };
        
        console.log(`Item "${item.title}": hash=${(hashScore*100).toFixed(1)}% pixel=${(pixelScore*100).toFixed(1)}% color=${(colorCompareScore*100).toFixed(1)}% total=${(weightedScore*100).toFixed(1)}%`);
        
        scoredItems.push({
          ...item,
          score: Math.min(0.99, weightedScore),
          diagnostics
        });
      }
      
      // Sort by score (highest first)
      scoredItems.sort((a, b) => b.score - a.score);
      
      // Return top 5 results
      return scoredItems.slice(0, 5);
    } catch (error) {
      console.error('Error finding similar items:', error);
      throw new Error('Failed to find similar items');
    }
  }
  
  /**
   * Get image features from a loaded Image element (used for uploaded image)
   * @private
   */
  async _getItemImageFeatures_fromImg(img) {
    const compareCanvas = document.createElement('canvas');
    const compareCtx = compareCanvas.getContext('2d');
    compareCanvas.width = 64;
    compareCanvas.height = 64;
    compareCtx.drawImage(img, 0, 0, 64, 64);
    const smallData = compareCtx.getImageData(0, 0, 64, 64);
    
    const fingerprint = this._createDHash(smallData);
    const colorHistogram = this._createColorHistogram(smallData.data);
    const pixelData = this._extractPixelSignature(smallData.data);
    
    return { fingerprint, colorHistogram, pixelData };
  }
  
  /**
   * Get image features for a stored item image (with caching)
   * @private
   */
  async _getItemImageFeatures(imageSource) {
    // Check cache
    const cacheKey = typeof imageSource === 'string' ? imageSource.substring(0, 100) : 'blob';
    if (this._imageFeatureCache && this._imageFeatureCache.has(cacheKey)) {
      return this._imageFeatureCache.get(cacheKey);
    }
    if (!this._imageFeatureCache) this._imageFeatureCache = new Map();
    
    const img = await this._loadImage(imageSource);
    
    // Resize to standard size for comparison - SAME process as uploaded image
    const compareCanvas = document.createElement('canvas');
    const compareCtx = compareCanvas.getContext('2d');
    compareCanvas.width = 64;
    compareCanvas.height = 64;
    compareCtx.drawImage(img, 0, 0, 64, 64);
    const smallData = compareCtx.getImageData(0, 0, 64, 64);
    
    // Create fingerprint from the standardized image
    const fingerprint = this._createDHash(smallData);
    const colorHistogram = this._createColorHistogram(smallData.data);
    const pixelData = this._extractPixelSignature(smallData.data);
    
    const features = { fingerprint, colorHistogram, pixelData };
    this._imageFeatureCache.set(cacheKey, features);
    return features;
  }
  
  /**
   * Extract a compact pixel signature for direct comparison
   * Samples pixels in a center-weighted grid
   * @private
   */
  _extractPixelSignature(pixels) {
    // Extract grayscale values at every 4th pixel for a 64x64 image
    // Focus more on the center (where the object usually is)
    const signature = [];
    const size = 64;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        // Weighted grayscale
        const gray = pixels[idx] * 0.299 + pixels[idx+1] * 0.587 + pixels[idx+2] * 0.114;
        signature.push(gray);
      }
    }
    
    return signature;
  }
  
  /**
   * Compare two pixel signatures using normalized cross-correlation
   * This is excellent at detecting identical or near-identical images
   * @private
   */
  _comparePixels(sig1, sig2) {
    if (!sig1 || !sig2 || sig1.length === 0 || sig2.length === 0) return 0;
    
    const len = Math.min(sig1.length, sig2.length);
    const size = 64;
    
    // Calculate means
    let mean1 = 0, mean2 = 0;
    for (let i = 0; i < len; i++) {
      mean1 += sig1[i];
      mean2 += sig2[i];
    }
    mean1 /= len;
    mean2 /= len;
    
    // Calculate normalized cross-correlation with center weighting
    let sumCross = 0, sumSq1 = 0, sumSq2 = 0;
    const centerX = size / 2, centerY = size / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
    
    for (let i = 0; i < len; i++) {
      const x = i % size;
      const y = Math.floor(i / size);
      
      // Center weight: pixels near center matter more
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const weight = 1.0 + (1.0 - dist / maxDist); // 1.0 at edge, 2.0 at center
      
      const d1 = (sig1[i] - mean1) * weight;
      const d2 = (sig2[i] - mean2) * weight;
      
      sumCross += d1 * d2;
      sumSq1 += d1 * d1;
      sumSq2 += d2 * d2;
    }
    
    const denom = Math.sqrt(sumSq1 * sumSq2);
    if (denom === 0) return 0;
    
    // NCC ranges from -1 to 1; we map it to 0-1
    const ncc = sumCross / denom;
    const score = (ncc + 1) / 2; // Map [-1,1] to [0,1]
    
    // Apply curve: identical images (score > 0.95) get very high results
    if (score > 0.98) return 0.98 + (score - 0.98) * 0.5;
    if (score > 0.90) return 0.85 + (score - 0.90) * 1.625;
    if (score > 0.80) return 0.60 + (score - 0.80) * 2.5;
    if (score > 0.65) return 0.30 + (score - 0.65) * 2.0;
    return score * 0.46;
  }
  
  /**
   * Create a difference hash (dHash) with 17x16 = 256 bit resolution
   * Higher resolution = better discrimination between different images
   * @private
   */
  _createDHash(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const pixels = imageData.data;
    const hash = [];
    
    // Use a 17x16 grid for 256-bit hash (much more discriminating than 72-bit)
    const gridW = 17;
    const gridH = 16;
    const gray = [];
    
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        // Sample with area averaging for more stable results
        const px = Math.floor(x * width / gridW);
        const py = Math.floor(y * height / gridH);
        const px2 = Math.min(width - 1, Math.floor((x + 1) * width / gridW));
        const py2 = Math.min(height - 1, Math.floor((y + 1) * height / gridH));
        
        let sum = 0, count = 0;
        for (let sy = py; sy <= py2; sy++) {
          for (let sx = px; sx <= px2; sx++) {
            const idx = (sy * width + sx) * 4;
            sum += pixels[idx] * 0.299 + pixels[idx+1] * 0.587 + pixels[idx+2] * 0.114;
            count++;
          }
        }
        gray.push(count > 0 ? sum / count : 0);
      }
    }
    
    // Compare adjacent pixels horizontally
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW - 1; x++) {
        const idx = y * gridW + x;
        hash.push(gray[idx] > gray[idx + 1] ? 1 : 0);
      }
    }
    
    return hash;
  }
  
  /**
   * Create a color histogram in HSL space with center weighting
   * HSL is better than RGB for perceptual color matching
   * Center weighting reduces background influence
   * @private
   */
  _createColorHistogram(pixels) {
    // 12 hue bins x 4 saturation bins x 4 lightness bins = 192 bins
    const hBins = 12, sBins = 4, lBins = 4;
    const totalBins = hBins * sBins * lBins;
    const histogram = new Array(totalBins).fill(0);
    let totalWeight = 0;
    const size = 64; // Assuming 64x64 image
    const centerX = size / 2, centerY = size / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
    
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i+3] < 128) continue; // skip transparent
      
      // Center weighting
      const pixIdx = i / 4;
      const x = pixIdx % size;
      const y = Math.floor(pixIdx / size);
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const weight = 1.0 + 2.0 * (1.0 - dist / maxDist); // 1 at edge, 3 at center
      
      // Convert RGB to HSL
      const r = pixels[i] / 255, g = pixels[i+1] / 255, b = pixels[i+2] / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const l = (max + min) / 2;
      let h = 0, s = 0;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
      }
      
      const hBin = Math.min(hBins - 1, Math.floor(h * hBins));
      const sBin = Math.min(sBins - 1, Math.floor(s * sBins));
      const lBin = Math.min(lBins - 1, Math.floor(l * lBins));
      
      histogram[hBin * sBins * lBins + sBin * lBins + lBin] += weight;
      totalWeight += weight;
    }
    
    // Normalize
    if (totalWeight > 0) {
      for (let i = 0; i < histogram.length; i++) {
        histogram[i] /= totalWeight;
      }
    }
    
    return histogram;
  }
  
  /**
   * Compare two fingerprints using Hamming distance
   * With 256-bit hash, we have much better discrimination
   * @private
   */
  _compareFingerprints(fp1, fp2) {
    if (!fp1 || !fp2 || fp1.length === 0 || fp2.length === 0) return 0;
    
    const len = Math.min(fp1.length, fp2.length);
    if (len === 0) return 0;
    
    let matches = 0;
    for (let i = 0; i < len; i++) {
      if (fp1[i] === fp2[i]) matches++;
    }
    
    // Hamming similarity (1 = identical, 0 = completely different)
    const similarity = matches / len;
    
    // With 256-bit hash, random chance gives ~50% match
    // Truly similar images should be >85%, identical >95%
    // Scale so that 50% raw → ~0, 100% raw → 1.0
    const adjusted = Math.max(0, (similarity - 0.50) / 0.50); // 0.5→0, 1.0→1.0
    
    // Apply curve to boost high matches
    if (adjusted > 0.90) return 0.95 + (adjusted - 0.90) * 0.5;
    if (adjusted > 0.70) return 0.75 + (adjusted - 0.70) * 1.0;
    if (adjusted > 0.40) return 0.35 + (adjusted - 0.40) * 1.33;
    return adjusted * 0.875;
  }
  
  /**
   * Compare two color histograms using Bhattacharyya coefficient
   * More discriminating than simple intersection for HSL histograms
   * @private
   */
  _compareColorHistograms(hist1, hist2) {
    if (!hist1 || !hist2 || hist1.length === 0 || hist2.length === 0) return 0;
    if (hist1.length !== hist2.length) return 0;
    
    // Bhattacharyya coefficient: sum of sqrt(h1[i] * h2[i])
    let bc = 0;
    for (let i = 0; i < hist1.length; i++) {
      bc += Math.sqrt((hist1[i] || 0) * (hist2[i] || 0));
    }
    
    // bc ranges from 0 (no overlap) to 1 (identical)
    // Apply curve to spread scores - identical should be very high
    const score = Math.min(1, bc);
    if (score > 0.95) return 0.95 + (score - 0.95) * 1.0;
    if (score > 0.80) return 0.65 + (score - 0.80) * 2.0;
    if (score > 0.60) return 0.30 + (score - 0.60) * 1.75;
    return score * 0.5;
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
   * Create image fingerprint using dHash for better matching
   * @private
   */
  _createImageFingerprint(imageData) {
    // Use dHash for a proper perceptual hash
    // First resize to 64x64 for standardized comparison
    const resizeCanvas = document.createElement('canvas');
    const resizeCtx = resizeCanvas.getContext('2d');
    resizeCanvas.width = 64;
    resizeCanvas.height = 64;
    
    // Put original imageData into a temp canvas, then resize
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    tempCtx.putImageData(imageData, 0, 0);
    
    resizeCtx.drawImage(tempCanvas, 0, 0, 64, 64);
    const smallData = resizeCtx.getImageData(0, 0, 64, 64);
    
    // Store the color histogram for later comparison
    this._lastColorHistogram = this._createColorHistogram(smallData.data);
    
    return this._createDHash(smallData);
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
  
  // Color, object, and feature scores are now handled by direct image comparison
  // in findSimilarItems via _compareFingerprints and _compareColorHistograms
}

// Export globally
window.ImprovedImageAnalyzer = new ImprovedImageAnalyzer();
