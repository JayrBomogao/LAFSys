const functions = require('firebase-functions');
const vision = require('@google-cloud/vision');
const admin = require('firebase-admin');
const https = require('https');

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

// ── EmailJS REST helper ────────────────────────────────────────────────────────
function sendEmailJS(templateParams) {
  const body = JSON.stringify({
    service_id:      'service_rvn1rn4',
    template_id:     'template_twn4j4h',
    user_id:         'htcONvQFGnnjNMtOf',
    template_params: templateParams,
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.emailjs.com',
      path:     '/api/v1.0/email/send',
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        console.log(`EmailJS response: status=${res.statusCode}, body=${raw}`);
        res.statusCode >= 200 && res.statusCode < 300
          ? resolve()
          : reject(new Error(`EmailJS ${res.statusCode}: ${raw}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── sendPasswordResetCode ─────────────────────────────────────────────────────
// Called by client: generates OTP, stores it, emails it.
exports.sendPasswordResetCode = functions.https.onCall(async (data) => {
  const email = (data.email || '').trim().toLowerCase();
  if (!email) throw new functions.https.HttpsError('invalid-argument', 'Email is required.');

  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch (_) {
    throw new functions.https.HttpsError('not-found', 'No account found with that email address.');
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  await db.collection('passwordResets').doc(email).set({
    otp,
    expiresAt,
    uid: user.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  try {
    await sendEmailJS({
      to_name:   user.displayName || email,
      to_email:  email,
      email:     email,
      from_name: 'Lost & Found - Baguio City',
      message:   `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
    });
  } catch (emailErr) {
    console.error('EmailJS failed:', emailErr.message);
    // Clean up the stored OTP since the user won't receive the code
    await db.collection('passwordResets').doc(email).delete().catch(() => {});
    throw new functions.https.HttpsError('internal', 'Failed to send verification email. Please try again.');
  }

  return { success: true };
});

// ── confirmPasswordResetOTP ───────────────────────────────────────────────────
// Called by client after user enters OTP: verifies, updates password.
exports.confirmPasswordResetOTP = functions.https.onCall(async (data) => {
  const email       = (data.email       || '').trim().toLowerCase();
  const otp         = (data.otp         || '').trim();
  const newPassword =  data.newPassword || '';

  if (!email || !otp || !newPassword)
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
  if (newPassword.length < 6)
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters.');

  const doc = await db.collection('passwordResets').doc(email).get();
  if (!doc.exists)
    throw new functions.https.HttpsError('not-found', 'No reset code found. Please request a new one.');

  const record = doc.data();

  if (Date.now() > record.expiresAt) {
    await db.collection('passwordResets').doc(email).delete();
    throw new functions.https.HttpsError('deadline-exceeded', 'Code has expired. Please request a new one.');
  }

  if (record.otp !== otp)
    throw new functions.https.HttpsError('invalid-argument', 'Incorrect code. Please try again.');

  await admin.auth().updateUser(record.uid, { password: newPassword });
  await db.collection('passwordResets').doc(email).delete();

  return { success: true };
});
