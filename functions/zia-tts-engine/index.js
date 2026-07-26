'use strict';

const catalyst = require('zcatalyst-sdk-node');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('@aswinnnn/edge-tts');

// Supported voices — Indian English by default, Kannada when explicitly requested.
const VOICES = {
  en: 'en-IN-NeerjaNeural',
  kn: 'kn-IN-SapnaNeural',
};

/**
 * Resolves the requested "language" value to a concrete edge-tts voice.
 * Defaults to Indian English unless "kn" or "kannada" (case-insensitive) is passed.
 */
function resolveVoice(language) {
  const lang = (language || '').toString().trim().toLowerCase();
  if (lang === 'kn' || lang === 'kannada') {
    return VOICES.kn;
  }
  return VOICES.en;
}

/**
 * Reads a Node.js Readable stream fully into a single Buffer.
 */
function bufferStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

module.exports = async (req, res) => {
  // Initialize the Catalyst execution context for this invocation. Kept even
  // though this function is stateless today, so future revisions can reach
  // Catalyst services (Data Store, ZCQL) from the same handler if needed.
  const context = catalyst.initialize(req);

  try {
    if (req.method !== 'POST') {
      res.status(405).send(JSON.stringify({ error: 'Only POST requests are supported by this function.' }));
      return;
    }

    // Advanced I/O functions may deliver the body as a raw string or a
    // pre-parsed object depending on the incoming Content-Type — handle both.
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { text, language } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).send(JSON.stringify({ error: '"text" is required and must be a non-empty string.' }));
      return;
    }

    const voice = resolveVoice(language);

    // Configure edge-tts with the resolved voice and a high-quality, compact
    // mono MP3 format suitable for direct browser playback.
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const { audioStream } = await tts.toStream(text);
    const audioBuffer = await bufferStream(audioStream);

    res.writeHead(200, {
      'Content-Type': 'audio/mp3',
      'Content-Length': audioBuffer.length,
    });
    res.end(audioBuffer);
  } catch (err) {
    // Log server-side for Catalyst function logs, return a clean error to the caller.
    console.error('zia-tts-engine error:', err);
    if (!res.headersSent) {
      res.status(500).send(JSON.stringify({
        error: 'Text-to-speech generation failed.',
        details: err && err.message ? err.message : String(err),
      }));
    } else {
      res.end();
    }
  } finally {
    // Always release the Catalyst execution context, on every code path
    // (success, validation failure, or unexpected error).
    context.close();
  }
};
