// Quick test script to verify Gemini API connection
// Run with: npm run test-api

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.VITE_API_KEY;

console.log('🔍 Testing Gemini API Connection...\n');
console.log('API Key present:', !!apiKey);
console.log('API Key length:', apiKey?.length || 0);
console.log('API Key prefix:', apiKey?.substring(0, 10) + '...');

if (!apiKey) {
  console.error('\n❌ ERROR: No API key found!');
  console.error('Please set VITE_GEMINI_API_KEY in .env.local');
  process.exit(1);
}

async function testConnection() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    console.log('\n📡 Sending test request to Gemini...');
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: 'Reply with exactly: "API connection successful!"' }]
      }]
    });
    
    const response = result.response;
    const text = response.text();
    
    console.log('\n✅ SUCCESS! Gemini responded:');
    console.log('Response:', text);
    console.log('\nFinish Reason:', response.candidates?.[0]?.finishReason || 'N/A');
    console.log('Safety Ratings:', response.candidates?.[0]?.safetyRatings?.length || 0, 'categories checked');
    
    // Test the error handling
    console.log('\n🧪 Testing error handling with invalid request...');
    try {
      await model.generateContent('This should fail'); // Wrong format
    } catch (error) {
      console.log('✅ Error handling works! Caught:', error.message.substring(0, 100));
    }
    
    console.log('\n🎉 All tests passed! Your Gemini API is properly configured.');
    
  } catch (error) {
    console.error('\n❌ ERROR connecting to Gemini:');
    console.error('Message:', error.message);
    
    if (error.message.includes('API key')) {
      console.error('\n💡 Your API key might be invalid. Get a new one at:');
      console.error('https://makersuite.google.com/app/apikey');
    } else if (error.message.includes('quota')) {
      console.error('\n💡 You may have exceeded your API quota.');
    } else {
      console.error('\n💡 Check your internet connection and try again.');
    }
    
    process.exit(1);
  }
}

// Run the test
testConnection();
