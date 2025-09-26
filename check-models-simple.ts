// Alternative check script without fs module
import { GoogleGenerativeAI } from "@google/generative-ai";

// You'll need to paste your API key here temporarily for testing
const API_KEY = "PASTE_YOUR_API_KEY_HERE";

const checkAvailableModels = async () => {
  if (API_KEY === "PASTE_YOUR_API_KEY_HERE") {
    console.error("Please edit check-models-simple.ts and paste your API key");
    process.exit(1);
  }
  
  const genAI = new GoogleGenerativeAI(API_KEY);
  
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
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash-8b-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro-001',
    'gemini-1.5-pro-002',
    'gemini-pro',
    'gemini-pro-vision',
    'gemini-2.0-flash-exp',
  ];
  
  const workingModels = [];
  
  for (const modelName of modelsToTry) {
    try {
      process.stdout.write(`Testing: ${modelName}... `);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Reply with just 'ok'");
      const response = result.response;
      const text = response.text();
      if (text) {
        console.log(`✅ WORKS!`);
        workingModels.push(modelName);
      }
    } catch (error) {
      const msg = error.message || error;
      if (msg.includes('API key not valid')) {
        console.log("\n❌ API KEY ERROR - Check your key");
        process.exit(1);
      }
      console.log(`❌`);
    }
  }
  
  console.log("\n" + "=".repeat(50));
  
  if (workingModels.length > 0) {
    console.log("\n✅ WORKING MODELS FOUND:");
    workingModels.forEach(model => {
      console.log(`   - ${model}`);
    });
    
    const recommended = workingModels[0];
    console.log(`\n📝 RECOMMENDED: Use "${recommended}" in your code`);
    console.log("\nTo update all files to use this model, run:");
    console.log(`\nOn Mac/Linux:`);
    console.log(`sed -i '' "s/gemini-1.0-pro/${recommended}/g" services/*.ts`);
    console.log(`\nOn Windows (Git Bash):`);
    console.log(`sed -i "s/gemini-1.0-pro/${recommended}/g" services/*.ts`);
  } else {
    console.log("\n❌ No working models found. This might mean:");
    console.log("1. Your API key needs to be enabled for Gemini");
    console.log("2. Try creating a new API key at:");
    console.log("   https://makersuite.google.com/app/apikey");
  }
};

checkAvailableModels().catch(console.error);
