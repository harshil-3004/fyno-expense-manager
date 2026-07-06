const https = require('https');
const AIProvider = require('./AIProvider');

/**
 * Gemini Provider
 * Concrete implementation of AIProvider for Google's Gemini models using direct HTTPS REST calls.
 */
class GeminiProvider extends AIProvider {
  constructor(config = {}) {
    super();
    this.apiKey = config.apiKey || '';
    this.modelName = config.modelName || 'gemini-2.5-flash';
  }

  /**
   * Helper to perform HTTPS POST requests to the Gemini API
   */
  _request(payload) {
    return new Promise((resolve, reject) => {
      if (!this.apiKey) {
        return reject(new Error('API key is not configured'));
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
      const postData = JSON.stringify(payload);

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 30000 // 30 seconds timeout
      };

      const req = https.request(url, options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = JSON.parse(responseBody);
              resolve(data);
            } catch (err) {
              reject(new Error('Failed to parse Gemini response as JSON'));
            }
          } else {
            let errorMsg = `API returned status ${res.statusCode}`;
            try {
              const errData = JSON.parse(responseBody);
              errorMsg += `: ${errData.error?.message || responseBody}`;
            } catch (_) {}
            reject(new Error(errorMsg));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Gemini API call timed out'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Generate a conversational chat response
   */
  async generateChatResponse(history, systemInstruction) {
    // Priority order for fallback attempts
    const modelsToTry = [this.modelName, 'gemini-3.1-flash-lite'];
    let lastError = null;

    const contents = history.map(item => ({
      role: item.role === 'model' ? 'model' : 'user',
      parts: [{ text: item.parts[0].text }]
    }));

    for (const model of modelsToTry) {
      try {
        const payload = {
          contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        };

        // Temporarily override the model identifier for this attempt
        const originalModel = this.modelName;
        this.modelName = model.replace('models/', '');
        const response = await this._request(payload);
        this.modelName = originalModel;

        const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (responseText) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          return responseText;
        }
      } catch (err) {
        console.warn(`GeminiProvider: Failed chat request with model "${model}". Trying fallback... Error: ${err.message}`);
        lastError = err;
      }
    }

    throw lastError || new Error('All model attempts failed');
  }

  /**
   * Generate structured JSON response
   */
  async generateStructuredResponse(prompt, systemInstruction) {
    // Priority order for fallback attempts
    const modelsToTry = [this.modelName, 'gemini-3.1-flash-lite'];
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const payload = {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        };

        // Temporarily override the model identifier for this attempt
        const originalModel = this.modelName;
        this.modelName = model.replace('models/', '');
        const response = await this._request(payload);
        this.modelName = originalModel;

        const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (responseText) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          return JSON.parse(responseText);
        }
      } catch (err) {
        console.warn(`GeminiProvider: Failed structured request with model "${model}". Trying fallback... Error: ${err.message}`);
        lastError = err;
      }
    }

    throw lastError || new Error('All structured model attempts failed');
  }
}

module.exports = GeminiProvider;
