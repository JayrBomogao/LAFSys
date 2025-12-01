const functions = require('firebase-functions');
const vision = require('@google-cloud/vision');

// Create a Cloud Vision client
const visionClient = new vision.ImageAnnotatorClient();

/**
 * Cloud Function to analyze an image using Google Cloud Vision API
 * This function is called from the client-side code
 */
exports.analyzeImage = functions.https.onCall(async (data, context) => {
  try {
    // Check if the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    // Check if image data is provided
    if (!data.image) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'The function must be called with image data.'
      );
    }

    // Decode the base64 image
    const imageBuffer = Buffer.from(data.image, 'base64');

    // Request features from the Vision API
    const [annotateResponse] = await visionClient.annotateImage({
      image: { content: imageBuffer },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 10 },
        { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
        { type: 'IMAGE_PROPERTIES', maxResults: 10 },
        { type: 'SAFE_SEARCH_DETECTION' }
      ],
    });

    // Extract the annotations we care about
    const result = {
      labelAnnotations: annotateResponse.labelAnnotations,
      localizedObjectAnnotations: annotateResponse.localizedObjectAnnotations,
      imagePropertiesAnnotation: annotateResponse.imagePropertiesAnnotation,
      safeSearchAnnotation: annotateResponse.safeSearchAnnotation
    };

    // Return the results
    return result;
  } catch (error) {
    console.error('Vision API Error:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Error processing image: ${error.message}`
    );
  }
});
