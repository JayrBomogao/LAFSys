/**
 * Image compressor utility for Lost and Found System
 * This utility helps reduce image file size before uploading to Firebase Storage
 */

// Default compression options
const DEFAULT_OPTIONS = {
  maxWidth: 1200,     // Maximum width of the output image
  maxHeight: 1200,    // Maximum height of the output image
  quality: 0.8,       // JPEG quality (0-1)
  mimeType: 'image/jpeg', // Output format
  minSize: 100000,    // Only compress if larger than 100KB
};

/**
 * Compresses an image file using canvas
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options (optional)
 * @returns {Promise<Blob>} - Promise resolving to compressed image blob
 */
function compressImage(file, customOptions = {}) {
  return new Promise((resolve, reject) => {
    // Merge default options with custom options
    const options = { ...DEFAULT_OPTIONS, ...customOptions };
    
    // Check if file is too small to compress
    if (file.size < options.minSize) {
      console.log('Image is small enough, skipping compression');
      return resolve(file);
    }

    // Skip compression if not an image
    if (!file.type.startsWith('image/')) {
      console.log('Not an image, skipping compression');
      return resolve(file);
    }

    // Create file reader to read image data
    const reader = new FileReader();
    
    reader.onload = function(e) {
      // Create an image element to get original dimensions
      const img = new Image();
      
      img.onload = function() {
        // Calculate new dimensions while preserving aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > options.maxWidth) {
          height = Math.round(height * options.maxWidth / width);
          width = options.maxWidth;
        }
        
        if (height > options.maxHeight) {
          width = Math.round(width * options.maxHeight / height);
          height = options.maxHeight;
        }
        
        // Create canvas for image compression
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Draw image on canvas with new dimensions
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas to Blob conversion failed'));
            return;
          }
          
          // Create a new file with the compressed data
          const compressedFile = new File([blob], file.name, {
            type: options.mimeType,
            lastModified: Date.now()
          });
          
          console.log(`Compression: ${Math.round(file.size / 1024)}KB → ${Math.round(compressedFile.size / 1024)}KB (${Math.round(compressedFile.size / file.size * 100)}%)`);
          
          resolve(compressedFile);
        }, options.mimeType, options.quality);
      };
      
      img.onerror = function() {
        reject(new Error('Failed to load image for compression'));
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = function() {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

// Export for use in other files
window.ImageCompressor = {
  compress: compressImage
};
