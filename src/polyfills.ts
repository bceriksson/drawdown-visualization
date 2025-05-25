import 'url-polyfill';
import { Buffer } from 'buffer';

// Ensure global Buffer is available
window.Buffer = window.Buffer || Buffer;

// Ensure URLSearchParams is available globally
if (typeof window.URLSearchParams === 'undefined') {
  const { URLSearchParams } = require('url-polyfill');
  window.URLSearchParams = URLSearchParams;
} 