const functions = require('firebase-functions');
const vision = require('@google-cloud/vision');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const visionClient = new vision.ImageAnnotatorClient();

/**
 * Analyze a query image (base64) using Google Cloud Vision API.
 * Called at search-time from the client to get labels for the uploaded image.
 */
exports.analyzeImage = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    if (!data.image) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'The function must be called with image data.'
      );
    }

    const imageBuffer = Buffer.from(data.image, 'base64');

    const [annotateResponse] = await visionClient.annotateImage({
      image: { content: imageBuffer },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 15 },
        { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
        { type: 'IMAGE_PROPERTIES', maxResults: 10 },
        { type: 'SAFE_SEARCH_DETECTION' },
        { type: 'WEB_DETECTION', maxResults: 10 },
        { type: 'TEXT_DETECTION' }
      ],
    });

    return {
      labelAnnotations: annotateResponse.labelAnnotations || [],
      localizedObjectAnnotations: annotateResponse.localizedObjectAnnotations || [],
      imagePropertiesAnnotation: annotateResponse.imagePropertiesAnnotation || null,
      safeSearchAnnotation: annotateResponse.safeSearchAnnotation || null,
      webDetection: annotateResponse.webDetection || {},
      textAnnotations: annotateResponse.textAnnotations || []
    };
  } catch (error) {
    console.error('Vision API Error:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Error processing image: ${error.message}`
    );
  }
});

/**
 * Enrich a stored item with Vision API labels.
 * Called fire-and-forget from the client after an item is uploaded.
 * Fetches the item's Storage image URL, runs Vision, writes labels back to Firestore.
 */
exports.enrichItemWithVision = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    const { itemId, imageUrl } = data;
    if (!itemId || !imageUrl) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'itemId and imageUrl are required.'
      );
    }

    // Skip base64 data URLs — we only process Storage URLs
    if (imageUrl.startsWith('data:')) {
      console.log(`Skipping base64 image for item ${itemId}`);
      return { success: false, reason: 'base64 images not supported for enrichment' };
    }

    // Fetch the image from the URL
    const https = require('https');
    const http = require('http');
    const imageBuffer = await new Promise((resolve, reject) => {
      const client = imageUrl.startsWith('https') ? https : http;
      client.get(imageUrl, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    });

    const [annotateResponse] = await visionClient.annotateImage({
      image: { content: imageBuffer },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 15 },
        { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
        { type: 'IMAGE_PROPERTIES', maxResults: 10 },
        { type: 'WEB_DETECTION', maxResults: 10 },
        { type: 'TEXT_DETECTION' }
      ],
    });

    const labelAnnotations = annotateResponse.labelAnnotations || [];
    const localizedObjectAnnotations = annotateResponse.localizedObjectAnnotations || [];
    const colors = (annotateResponse.imagePropertiesAnnotation
      && annotateResponse.imagePropertiesAnnotation.dominantColors
      && annotateResponse.imagePropertiesAnnotation.dominantColors.colors) || [];
    const webEntities = (annotateResponse.webDetection && annotateResponse.webDetection.webEntities) || [];
    const textAnnotations = annotateResponse.textAnnotations || [];

    const visionData = {
      visionLabels: labelAnnotations.map(l => ({
        description: l.description || '',
        score: l.score || 0
      })),
      visionObjects: localizedObjectAnnotations.map(o => ({
        name: o.name || '',
        score: o.score || 0
      })),
      visionColors: colors.slice(0, 5).map(c => ({
        red: (c.color && c.color.red) || 0,
        green: (c.color && c.color.green) || 0,
        blue: (c.color && c.color.blue) || 0,
        score: c.score || 0,
        pixelFraction: c.pixelFraction || 0
      })),
      visionWebEntities: webEntities.slice(0, 10).map(e => ({
        description: e.description || '',
        score: e.score || 0
      })),
      visionText: textAnnotations.length > 0 ? (textAnnotations[0].description || '') : '',
      visionAnalyzedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('items').doc(itemId).update(visionData);

    console.log(`Vision enrichment complete for item ${itemId}: ${labelAnnotations.length} labels`);
    return { success: true, labelCount: labelAnnotations.length };
  } catch (error) {
    console.error('Enrichment Error:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Error enriching item: ${error.message}`
    );
  }
});
