/**
 * jest.setup.js
 * Jest setup file to load environment variables and configure test environment
 */

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

// Set NODE_ENV to test if not already set
process.env.NODE_ENV = 'test';

// Optional: Suppress console logs during tests (comment out if you want logs)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
