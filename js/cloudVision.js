/**
 * Google Cloud Vision API integration for LAFSys
 * Calls the Vision REST API directly from the browser (no Cloud Function required).
 *
 * SETUP: Replace the placeholder below with your Google Cloud Vision API key.
 * Get one at: https://console.cloud.google.com → APIs & Services → Credentials → Create API Key
 * Then enable the Cloud Vision API: APIs & Services → Library → search "Cloud Vision API" → Enable
 * Restrict the key to your domain: Credentials → edit key → HTTP referrers
 */
const VISION_API_KEY = 'AIzaSyAKl8m89GmmhyS88ushFDQi0r4F6CSXwkg';

const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;

class CloudVisionHelper {
    constructor() {
        this.available = VISION_API_KEY !== 'YOUR_VISION_API_KEY' && VISION_API_KEY.length > 0;
        if (!this.available) {
            console.warn('Cloud Vision: API key not configured. Set VISION_API_KEY in cloudVision.js');
        } else {
            console.log('Cloud Vision Helper initialized (direct REST API mode)');
        }
    }

    /**
     * Analyze an image using the Vision REST API.
     * @param {File|Blob|string} imageData - File, Blob, data URL, or Storage URL
     * @returns {Promise<Object>} Vision API response (labelAnnotations, webDetection, etc.)
     */
    async analyzeImage(imageData) {
        if (!this.available) {
            throw new Error('Cloud Vision API key not configured. See cloudVision.js for setup instructions.');
        }

        const imageBase64 = await this._toBase64(imageData);

        const requestBody = {
            requests: [{
                image: { content: imageBase64 },
                features: [
                    { type: 'LABEL_DETECTION',       maxResults: 15 },
                    { type: 'OBJECT_LOCALIZATION',    maxResults: 10 },
                    { type: 'IMAGE_PROPERTIES',       maxResults: 10 },
                    { type: 'SAFE_SEARCH_DETECTION' },
                    { type: 'WEB_DETECTION',          maxResults: 10 },
                    { type: 'TEXT_DETECTION' }
                ]
            }]
        };

        const response = await fetch(VISION_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`Vision API error ${response.status}: ${(err.error && err.error.message) || response.statusText}`);
        }

        const data = await response.json();

        if (data.responses && data.responses[0] && data.responses[0].error) {
            throw new Error(`Vision API error: ${data.responses[0].error.message}`);
        }

        return data.responses[0] || {};
    }

    /**
     * Analyze an item's image and write Vision labels back to its Firestore document.
     * Safe to call fire-and-forget — all errors are caught and logged.
     * @param {string} itemId - Firestore document ID
     * @param {File|Blob|string} imageData - image File, Blob, or URL
     * @returns {Promise<void>}
     */
    async enrichItem(itemId, imageData) {
        if (!this.available) {
            console.warn('Vision enrichment skipped: API key not configured.');
            return;
        }

        try {
            const result = await this.analyzeImage(imageData);

            const labelAnnotations          = result.labelAnnotations || [];
            const localizedObjectAnnotations = result.localizedObjectAnnotations || [];
            const colors = (result.imagePropertiesAnnotation &&
                            result.imagePropertiesAnnotation.dominantColors &&
                            result.imagePropertiesAnnotation.dominantColors.colors) || [];
            const webEntities = (result.webDetection && result.webDetection.webEntities) || [];
            const textAnnotations = result.textAnnotations || [];

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
                    red:          (c.color && c.color.red)   || 0,
                    green:        (c.color && c.color.green) || 0,
                    blue:         (c.color && c.color.blue)  || 0,
                    score:        c.score || 0,
                    pixelFraction: c.pixelFraction || 0
                })),
                visionWebEntities: webEntities.slice(0, 10).map(e => ({
                    description: e.description || '',
                    score: e.score || 0
                })),
                visionText: textAnnotations.length > 0 ? (textAnnotations[0].description || '') : '',
                visionAnalyzedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await firebase.firestore().collection('items').doc(itemId).update(visionData);
            console.log(`Vision enrichment complete for ${itemId}: ${labelAnnotations.length} labels`);
        } catch (err) {
            console.warn(`Vision enrichment failed for ${itemId} (non-critical):`, err.message);
        }
    }

    /**
     * Convert any supported image format to a raw base64 string (no data: prefix).
     * Compresses Blobs/Files to ≤1200px and JPEG quality 0.85 before encoding
     * so the payload stays well under the Vision API's ~10 MB limit.
     * @private
     */
    async _toBase64(imageData) {
        if (imageData instanceof Blob) {
            const compressed = await this._compressImage(imageData);
            return this._blobToBase64(compressed);
        }
        if (typeof imageData === 'string') {
            if (imageData.startsWith('data:')) {
                return imageData.split(',')[1];
            }
            // Storage URL or any HTTP URL — fetch first
            const res = await fetch(imageData);
            const blob = await res.blob();
            const compressed = await this._compressImage(blob);
            return this._blobToBase64(compressed);
        }
        throw new Error('Unsupported image format for Vision API');
    }

    /**
     * Resize image to fit within MAX_PX on the longest edge, output as JPEG.
     * Falls back to original blob if canvas is unavailable.
     * @private
     */
    _compressImage(blob) {
        const MAX_PX = 1200;
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(blob);
            img.onload = () => {
                URL.revokeObjectURL(url);
                let w = img.naturalWidth, h = img.naturalHeight;
                if (w <= MAX_PX && h <= MAX_PX) {
                    // Already small enough — just re-encode as JPEG to normalise format
                    const c = document.createElement('canvas');
                    c.width = w; c.height = h;
                    c.getContext('2d').drawImage(img, 0, 0);
                    c.toBlob(b => resolve(b || blob), 'image/jpeg', 0.85);
                } else {
                    const ratio = Math.min(MAX_PX / w, MAX_PX / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                    const c = document.createElement('canvas');
                    c.width = w; c.height = h;
                    c.getContext('2d').drawImage(img, 0, 0, w, h);
                    c.toBlob(b => resolve(b || blob), 'image/jpeg', 0.85);
                }
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
            img.src = url;
        });
    }

    /**
     * Read a Blob/File as base64 using FileReader.
     * @private
     */
    _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = () => resolve(reader.result.split(',')[1]);
            reader.onerror = () => reject(new Error('Failed to convert image to base64'));
            reader.readAsDataURL(blob);
        });
    }
}

const cloudVision = new CloudVisionHelper();
window.CloudVision = cloudVision;
