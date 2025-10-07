# Configuration Setup

This directory contains configuration files for the iOS app.

## Setup Instructions

### 1. API Keys Configuration

1. Copy `Config.swift.template` to `Config.swift`:
   ```bash
   cp Config.swift.template Config.swift
   ```

2. Replace `YOUR_GEMINI_API_KEY_HERE` with your actual Gemini API key in `Config.swift`

3. The `Config.swift` file is already added to `.gitignore` and will not be committed to version control.

### 2. Environment Variables (Alternative)

You can also set the API key using environment variables:

```bash
export GEMINI_API_KEY="your_actual_api_key_here"
```

### 3. Security Notes

- Never commit `Config.swift` with real API keys
- Use environment variables in production
- Consider using iOS Keychain for storing sensitive data
- The template file (`Config.swift.template`) is safe to commit

### 4. Files in this Directory

- `Config.swift.template` - Template file (safe to commit)
- `Config.swift` - Actual configuration (ignored by git)
- `README.md` - This file
