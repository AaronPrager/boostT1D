# API Key Setup for iOS App

## Security Notice
The Google Gemini API key has been removed from the codebase for security reasons. You need to set it up as an environment variable.

## Setup Instructions

### Option 1: Xcode Scheme (Recommended)
1. Open the project in Xcode
2. Go to Product → Scheme → Edit Scheme
3. Select "Run" from the left sidebar
4. Go to the "Arguments" tab
5. Under "Environment Variables", click the "+" button
6. Add:
   - Name: `GEMINI_API_KEY`
   - Value: `your_actual_api_key_here`

### Option 2: Environment Variable
Set the environment variable in your shell:
```bash
export GEMINI_API_KEY="your_actual_api_key_here"
```

### Option 3: .xcconfig File (Advanced)
1. Create a `Config.xcconfig` file
2. Add: `GEMINI_API_KEY = your_actual_api_key_here`
3. Add the file to your target's build settings

## Getting Your API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Copy the key and use it in the setup above

## Security Best Practices
- Never commit API keys to version control
- Use environment variables or secure keychain storage
- Rotate keys regularly
- Use different keys for development and production

## Troubleshooting
If you get a "GEMINI_API_KEY environment variable is required" error:
1. Make sure the environment variable is set correctly
2. Restart Xcode after setting the variable
3. Clean and rebuild the project
