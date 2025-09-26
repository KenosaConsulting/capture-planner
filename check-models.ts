// Quick script to check which models are available with your API key

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from 'fs';

const checkAvailableModels = async () => {
  // Read API key from .env.local file
  let apiKey = '';
  try {
    const envContent = fs.readFileSync('.env.local', 'utf-8');
    const match = envContent.match(/VITE_API_KEY=(.+)/);
    if (match) {
      apiKey = match[1].trim();
    }
  } catch (e) {
    console.error("Could not read .env.local file. Make sure VITE_API_KEY is set.");
    process.exit(1);
  }
  
  if (!apiKey || apiKey === 'your_actual_gemini_api_key_here') {
    console.error("Please set a valid API key in .env.local");
    process.exit(1);
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  console.log("Checking available models with your API key...\n");
  
  // Try different model names
  const modelsToTry = [
    'gemini-1.0-pro',
    'gemini-1.0-pro-latest',
    'gemini-1.0-pro-001',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash-002',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro-001',
    'gemini-1.5-pro-002',
    'gemini-pro',
    'gemini-pro-vision',
    'models/gemini-1.0-pro',
    'models/gemini-pro',
  ];
  
  const workingModels = [];
  
  for (const modelName of modelsToTry) {
    try {
      process.stdout.write(`Testing: ${modelName}... `);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Reply with just the word 'test'");
      const response = result.response;
      const text = response.text();
      if (text) {
        console.log(`✅ WORKS!`);
        workingModels.push(modelName);
      }
    } catch (error) {
      console.log(`❌ ${error.message.substring(0, 50)}...`);
    }
  }
  
  console.log("\n" + "=".repeat(50));
  
  if (workingModels.length > 0) {
    console.log("\n✅ WORKING MODELS FOUND:");
    workingModels.forEach(model => {
      console.log(`   - ${model}`);
    });
    
    console.log(`\n📝 RECOMMENDED: Use "${workingModels[0]}" in your code`);
    console.log("\nTo update all files to use this model, run:");
    console.log(`sed -i '' "s/gemini-1.0-pro/${workingModels[0]}/g" services/*.ts`);
  } else {
    console.log("\n❌ No working models found. Please check:");
    console.log("1. Your API key is valid");
    console.log("2. The Gemini API is enabled in your Google Cloud project");
    console.log("3. You have billing enabled if required");
  }
};

checkAvailableModels().catch(console.error);
