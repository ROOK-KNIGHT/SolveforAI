/**
 * Fingerprint Manager
 * 
 * Manages browser fingerprint randomization to evade detection.
 * This module provides utilities to modify and rotate browser fingerprints,
 * including user agents, TLS fingerprints, and other identifying features.
 */

const crypto = require('crypto');

/**
 * Fingerprint configuration for browser evasion
 */
class FingerprintManager {
  constructor(options = {}) {
    this.options = {
      rotationInterval: options.rotationInterval || 10, // Number of requests before rotation
      randomizeUserAgent: options.randomizeUserAgent !== false,
      randomizeScreenSize: options.randomizeScreenSize !== false,
      randomizeTimezone: options.randomizeTimezone !== false,
      randomizeLanguage: options.randomizeLanguage !== false,
      randomizeWebGL: options.randomizeWebGL !== false,
      randomizeCanvas: options.randomizeCanvas !== false,
      randomizeFonts: options.randomizeFonts !== false
    };
    
    this.requestCount = 0;
    this.currentFingerprint = this.generateFingerprint();
  }
  
  /**
   * Generate a random fingerprint configuration
   */
  generateFingerprint() {
    return {
      userAgent: this.getRandomUserAgent(),
      screen: this.getRandomScreenSize(),
      timezone: this.getRandomTimezone(),
      language: this.getRandomLanguage(),
      webglVendor: this.getRandomWebGLVendor(),
      webglRenderer: this.getRandomWebGLRenderer(),
      fonts: this.getRandomFonts(),
      canvasNoise: this.generateCanvasNoise()
    };
  }
  
  /**
   * Get current fingerprint or generate a new one if needed
   */
  getFingerprint() {
    this.requestCount++;
    
    // Check if we need to rotate the fingerprint
    if (this.requestCount >= this.options.rotationInterval) {
      this.currentFingerprint = this.generateFingerprint();
      this.requestCount = 0;
    }
    
    return this.currentFingerprint;
  }
  
  /**
   * Generate JavaScript to apply to a page for fingerprint spoofing
   */
  getFingerprintOverrideScript() {
    const fingerprint = this.getFingerprint();
    
    return `
      // Override User-Agent
      Object.defineProperty(navigator, 'userAgent', {
        get: () => '${fingerprint.userAgent}'
      });
      
      // Override screen properties
      Object.defineProperty(window, 'screen', {
        get: () => ({
          availHeight: ${fingerprint.screen.availHeight},
          availWidth: ${fingerprint.screen.availWidth},
          height: ${fingerprint.screen.height},
          width: ${fingerprint.screen.width},
          colorDepth: ${fingerprint.screen.colorDepth},
          pixelDepth: ${fingerprint.screen.pixelDepth}
        })
      });
      
      // Override timezone
      Object.defineProperty(Intl, 'DateTimeFormat', {
        get: () => function() {
          return {
            resolvedOptions: () => ({ timeZone: '${fingerprint.timezone}' })
          };
        }
      });
      
      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['${fingerprint.language}', 'en-US', 'en']
      });
      
      // Override WebGL vendor and renderer
      const getParameterProxyHandler = {
        apply: function(target, thisArg, args) {
          const param = args[0];
          if (param === 37445) { // UNMASKED_VENDOR_WEBGL
            return '${fingerprint.webglVendor}';
          }
          if (param === 37446) { // UNMASKED_RENDERER_WEBGL
            return '${fingerprint.webglRenderer}';
          }
          return Reflect.apply(target, thisArg, args);
        }
      };
      
      // Override canvas fingerprinting
      const toDataURLProxyHandler = {
        apply: function(target, thisArg, args) {
          const result = Reflect.apply(target, thisArg, args);
          if (result.substring(0, 22) === 'data:image/png;base64,') {
            // Add minor noise to canvas data to change fingerprint
            const noise = '${fingerprint.canvasNoise}';
            return result.substring(0, 100) + noise + result.substring(100);
          }
          return result;
        }
      };
      
      // Apply proxies when context is available
      if (HTMLCanvasElement.prototype.toDataURL) {
        HTMLCanvasElement.prototype.toDataURL = new Proxy(
          HTMLCanvasElement.prototype.toDataURL, 
          toDataURLProxyHandler
        );
      }
      
      // Attempt to override WebGL when available
      const overrideWebGL = () => {
        try {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          if (gl && gl.getParameter) {
            gl.getParameter = new Proxy(gl.getParameter, getParameterProxyHandler);
          }
        } catch (e) {}
      };
      
      // Run immediately and on page load
      overrideWebGL();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', overrideWebGL);
      }
    `;
  }
  
  /**
   * Get a list of common user agents
   */
  getRandomUserAgent() {
    const userAgents = [
      // Chrome on Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
      
      // Chrome on macOS
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
      
      // Firefox on Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:96.0) Gecko/20100101 Firefox/96.0',
      
      // Firefox on macOS
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:90.0) Gecko/20100101 Firefox/90.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:96.0) Gecko/20100101 Firefox/96.0',
      
      // Safari on macOS
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
      
      // Edge on Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36 Edg/92.0.902.55',
      
      // Mobile user agents
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 11; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
    ];
    
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
  
  /**
   * Get a random screen size
   */
  getRandomScreenSize() {
    const screenSizes = [
      { width: 1366, height: 768, availWidth: 1366, availHeight: 728, colorDepth: 24, pixelDepth: 24 },  // Most common
      { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24 }, // Full HD
      { width: 1536, height: 864, availWidth: 1536, availHeight: 824, colorDepth: 24, pixelDepth: 24 },   // Common laptop
      { width: 1440, height: 900, availWidth: 1440, availHeight: 860, colorDepth: 24, pixelDepth: 24 },   // MacBook Pro
      { width: 1280, height: 800, availWidth: 1280, availHeight: 760, colorDepth: 24, pixelDepth: 24 },   // MacBook
      { width: 2560, height: 1440, availWidth: 2560, availHeight: 1400, colorDepth: 24, pixelDepth: 24 }, // 2K
      { width: 3840, height: 2160, availWidth: 3840, availHeight: 2120, colorDepth: 24, pixelDepth: 24 }  // 4K
    ];
    
    return screenSizes[Math.floor(Math.random() * screenSizes.length)];
  }
  
  /**
   * Get a random timezone
   */
  getRandomTimezone() {
    const timezones = [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Toronto',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Moscow',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Singapore',
      'Australia/Sydney',
      'Pacific/Auckland'
    ];
    
    return timezones[Math.floor(Math.random() * timezones.length)];
  }
  
  /**
   * Get a random language
   */
  getRandomLanguage() {
    const languages = [
      'en-US',
      'en-GB',
      'fr-FR',
      'de-DE',
      'es-ES',
      'it-IT',
      'pt-BR',
      'ja-JP',
      'zh-CN',
      'ru-RU',
      'ko-KR',
      'ar-SA',
      'nl-NL',
      'pl-PL',
      'tr-TR',
      'sv-SE'
    ];
    
    return languages[Math.floor(Math.random() * languages.length)];
  }
  
  /**
   * Get a random WebGL vendor
   */
  getRandomWebGLVendor() {
    const vendors = [
      'Google Inc. (Intel)',
      'Google Inc. (NVIDIA)',
      'Google Inc. (AMD)',
      'Google Inc.',
      'Apple Computer, Inc.',
      'Intel Inc.',
      'NVIDIA Corporation',
      'AMD, Inc.',
      'Microsoft Corporation'
    ];
    
    return vendors[Math.floor(Math.random() * vendors.length)];
  }
  
  /**
   * Get a random WebGL renderer
   */
  getRandomWebGLRenderer() {
    const renderers = [
      'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (Intel, Intel(R) HD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (NVIDIA, NVIDIA GeForce RTX 2070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'Intel Iris OpenGL Engine',
      'Apple GPU',
      'Mesa DRI Intel(R) UHD Graphics 630 (CFL GT2)',
      'AMD Radeon Pro 5500M OpenGL Engine',
      'NVIDIA GeForce GTX 980/PCIe/SSE2'
    ];
    
    return renderers[Math.floor(Math.random() * renderers.length)];
  }
  
  /**
   * Get a random set of fonts
   */
  getRandomFonts() {
    const commonFonts = [
      'Arial', 'Arial Black', 'Arial Narrow', 'Calibri', 'Cambria', 'Cambria Math',
      'Comic Sans MS', 'Courier', 'Courier New', 'Georgia', 'Helvetica', 'Impact',
      'Lucida Console', 'Lucida Sans Unicode', 'Microsoft Sans Serif', 'Palatino Linotype',
      'Segoe UI', 'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS', 'Verdana'
    ];
    
    // Select a random subset of fonts
    const fontCount = 5 + Math.floor(Math.random() * 10); // Between 5-14 fonts
    const selectedFonts = [];
    
    for (let i = 0; i < fontCount; i++) {
      const randomFont = commonFonts[Math.floor(Math.random() * commonFonts.length)];
      if (!selectedFonts.includes(randomFont)) {
        selectedFonts.push(randomFont);
      }
    }
    
    return selectedFonts;
  }
  
  /**
   * Generate random canvas noise to disrupt fingerprinting
   */
  generateCanvasNoise() {
    return crypto.randomBytes(10).toString('base64');
  }
}

module.exports = FingerprintManager;
