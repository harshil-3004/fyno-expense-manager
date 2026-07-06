import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

// Configurable constants for Smart Pause Detection
export const SILENCE_TIMEOUT_MS = 2500;
export const MAX_RECORDING_MS = 60000;

// Dynamic import for expo-speech-recognition since it contains native modules
// which are not available in standard Expo Go clients.
let ExpoSpeechRecognitionModule = null;
try {
  ExpoSpeechRecognitionModule = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch (error) {
  console.warn(
    '[VoiceService] expo-speech-recognition native module could not be loaded. ' +
    'If you are using Expo Go, this feature is disabled. Use a development client to enable it.'
  );
}

/**
 * Voice Service Interface (Phase 3 & 4)
 * Platform-agnostic speech-to-text and text-to-speech service.
 * Automatically delegates to browser Web Speech API on Web platforms,
 * and uses expo-speech-recognition and expo-speech on native iOS/Android.
 */
class VoiceService {
  constructor() {
    this.recognition = null;
    this.synthesis = null;
    this.currentUtterance = null;
    
    // Callback holders
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onStateChangeCallback = null; // 'idle' | 'listening' | 'speaking'
    this.onPartialResultCallback = null;

    // Timers & States for Smart Pause Detection
    this.silenceTimer = null;
    this.pauseTimer = null;
    this.maxDurationTimer = null;
    this.lastTranscript = '';
    this.hasFinalized = false;

    // Subscriptions array for native event listeners
    this.nativeSubscriptions = [];

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
          this._updateState('listening');
        };

        this.recognition.onresult = (event) => {
          this._handleSpeechEvent(event);
        };

        this.recognition.onerror = (event) => {
          console.error('[VoiceService Web STT Error]', event.error);
          if (this.onErrorCallback) {
            this.onErrorCallback(event.error);
          }
        };

        this.recognition.onend = () => {
          this._updateState('idle');
          this._handleRecognitionEnded();
        };
      }

      this.synthesis = window.speechSynthesis;
    }
  }

  /**
   * Internal helper to broadcast state updates
   */
  _updateState(state) {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state);
    }
  }

  _clearTimers() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }
  }

  _handleSpeechEvent(event) {
    if (this.hasFinalized) return;

    let finalTranscript = '';
    let interimTranscript = '';
    
    if (event && event.results) {
      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        if (!result) continue;
        
        const transcript = (result.transcript || result[0]?.transcript || '').trim();
        if (result.isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript + ' ';
        }
      }
    }

    const fullText = (finalTranscript + interimTranscript).trim();
    if (!fullText) return;

    this.lastTranscript = fullText;

    // Reset silence and pause timers since user is active
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }

    // Call the partial result callback with isWaitingForSilence = false (actively speaking)
    if (this.onPartialResultCallback) {
      this.onPartialResultCallback(fullText, false);
    }

    // Set pauseTimer to trigger "Waiting for you to finish..." status
    this.pauseTimer = setTimeout(() => {
      if (this.onPartialResultCallback) {
        this.onPartialResultCallback(fullText, true);
      }
    }, 1000);

    // Set silenceTimer to finalize speech after SILENCE_TIMEOUT_MS of no updates
    this.silenceTimer = setTimeout(() => {
      this._finalizeSpeech(fullText);
    }, SILENCE_TIMEOUT_MS);
  }

  _finalizeSpeech(fullText) {
    if (this.hasFinalized) return;
    this.hasFinalized = true;

    this._clearTimers();
    this.stopListening();

    if (this.onResultCallback) {
      this.onResultCallback(fullText.trim());
    }
  }

  _handleRecognitionEnded() {
    this._clearTimers();

    const finalResult = this.lastTranscript ? this.lastTranscript.trim() : '';
    if (finalResult && !this.hasFinalized) {
      this.hasFinalized = true;
      if (this.onResultCallback) {
        this.onResultCallback(finalResult);
      }
    }
  }

  finalizeListening() {
    this._finalizeSpeech(this.lastTranscript);
  }

  /**
   * Helper to remove native event listeners and prevent memory leaks
   */
  _clearNativeSubscriptions() {
    if (this.nativeSubscriptions && this.nativeSubscriptions.length > 0) {
      this.nativeSubscriptions.forEach((sub) => {
        if (sub && typeof sub.remove === 'function') {
          sub.remove();
        }
      });
      this.nativeSubscriptions = [];
    }
  }

  /**
   * Checks if speech features are supported in the current environment
   */
  isSupported() {
    if (Platform.OS === 'web') {
      return !!(this.recognition && this.synthesis);
    }
    // Speech recognition requires the native module to be successfully loaded
    return !!ExpoSpeechRecognitionModule;
  }

  /**
   * Starts listening for voice input
   * @param {function} onResult - callback (text) => {}
   * @param {function} onError - callback (errorStr) => {}
   * @param {function} onStateChange - callback (state) => {}
   */
  async startListening(onResult, onError, onStateChange, onPartialResult) {
    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onStateChangeCallback = onStateChange;
    this.onPartialResultCallback = onPartialResult;

    this.lastTranscript = '';
    this.hasFinalized = false;
    this._clearTimers();

    // Start maximum recording duration timer (60s)
    this.maxDurationTimer = setTimeout(() => {
      console.log('[VoiceService] Maximum recording duration reached. Finalizing.');
      this._finalizeSpeech(this.lastTranscript);
    }, MAX_RECORDING_MS);

    if (Platform.OS === 'web') {
      if (!this.recognition) {
        if (this.onErrorCallback) this.onErrorCallback('Speech recognition not supported in this browser.');
        return;
      }
      try {
        this.recognition.start();
      } catch (err) {
        console.warn('SpeechRecognition start warning:', err.message);
      }
    } else {
      // Native Mobile STT implementation using expo-speech-recognition
      try {
        if (!ExpoSpeechRecognitionModule) {
          if (this.onErrorCallback) {
            this.onErrorCallback('Speech recognition is not supported in this environment (e.g. Expo Go).');
          }
          return;
        }

        // 1. Request microphone and speech permissions
        const permissionResult = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permissionResult.granted) {
          if (this.onErrorCallback) {
            this.onErrorCallback('Permission to access microphone or speech recognition was denied.');
          }
          return;
        }

        // 2. Clear old subscriptions to avoid duplicates
        this._clearNativeSubscriptions();

        // 3. Register native event listeners
        this.nativeSubscriptions.push(
          ExpoSpeechRecognitionModule.addListener('start', () => {
            console.log('[VoiceService Native] Speech recognition started');
            this._updateState('listening');
          })
        );

        this.nativeSubscriptions.push(
          ExpoSpeechRecognitionModule.addListener('end', () => {
            console.log('[VoiceService Native] Speech recognition ended');
            this._updateState('idle');
            this._handleRecognitionEnded();
            this._clearNativeSubscriptions();
          })
        );

        this.nativeSubscriptions.push(
          ExpoSpeechRecognitionModule.addListener('result', (event) => {
            this._handleSpeechEvent(event);
          })
        );

        this.nativeSubscriptions.push(
          ExpoSpeechRecognitionModule.addListener('error', (event) => {
            console.error('[VoiceService Native] STT Error:', event.error);
            if (this.onErrorCallback) {
              this.onErrorCallback(event.error || 'Speech recognition error occurred');
            }
            this._clearTimers();
            this._clearNativeSubscriptions();
            this._updateState('idle');
          })
        );

        // 4. Start the native engine
        await ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: true,
          continuous: true,
        });

      } catch (err) {
        console.error('[VoiceService Native] Exception in startListening:', err);
        if (this.onErrorCallback) {
          this.onErrorCallback(err.message || 'Failed to start speech recognition');
        }
        this._clearTimers();
        this._updateState('idle');
      }
    }
  }

  /**
   * Stops listening for voice input immediately
   */
  stopListening() {
    this._clearTimers();
    if (Platform.OS === 'web') {
      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch (err) {
          console.warn('SpeechRecognition stop warning:', err.message);
        }
      }
    } else {
      try {
        if (ExpoSpeechRecognitionModule) {
          ExpoSpeechRecognitionModule.abort();
        }
      } catch (err) {
        console.warn('ExpoSpeechRecognitionModule abort warning:', err.message);
      }
      this._clearNativeSubscriptions();
      this._updateState('idle');
    }
  }

  /**
   * Speaks the given text aloud using text-to-speech
   * @param {string} text 
   * @param {function} onStart 
   * @param {function} onEnd 
   * @param {function} onError 
   */
  speak(text, onStart, onEnd, onError) {
    if (Platform.OS === 'web') {
      if (!this.synthesis) {
        if (onError) onError('Speech synthesis not supported.');
        return;
      }

      this.cancelSpeech(); // Clear any ongoing speech first

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      utterance.onstart = () => {
        this._updateState('speaking');
        if (onStart) onStart();
      };

      utterance.onend = () => {
        this._updateState('idle');
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = (event) => {
        console.error('[VoiceService Web TTS Error]', event);
        this._updateState('idle');
        this.currentUtterance = null;
        if (onError) onError(event.error || 'Speech synthesis failed');
      };

      this.synthesis.speak(utterance);
    } else {
      // Native Mobile TTS implementation using expo-speech
      try {
        this.cancelSpeech(); // Stop any ongoing speech before starting a new one

        Speech.speak(text, {
          language: 'en-US',
          onStart: () => {
            console.log('[VoiceService Native] Speaking started');
            this._updateState('speaking');
            if (onStart) onStart();
          },
          onDone: () => {
            console.log('[VoiceService Native] Speaking completed');
            this._updateState('idle');
            if (onEnd) onEnd();
          },
          onError: (err) => {
            console.error('[VoiceService Native] Speaking error:', err);
            this._updateState('idle');
            if (onError) onError(err.message || 'Speech playback failed');
          }
        });
      } catch (err) {
        console.error('[VoiceService Native] Exception in speak:', err);
        if (onError) onError(err.message);
        this._updateState('idle');
      }
    }
  }

  /**
   * Cancels any active speech synthesis immediately
   */
  cancelSpeech() {
    if (Platform.OS === 'web') {
      if (this.synthesis) {
        this.synthesis.cancel();
        this._updateState('idle');
        this.currentUtterance = null;
      }
    } else {
      try {
        Speech.stop();
      } catch (err) {
        console.warn('Speech.stop warning:', err.message);
      }
      this._updateState('idle');
    }
  }
}

export default new VoiceService();
