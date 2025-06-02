# boostT1D

## Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your actual values:
   - `DATABASE_URL`: Your Prisma database connection string
   - `NEXTAUTH_SECRET`: A secure random string (use `openssl rand -base64 32`)
   - `GOOGLE_AI_API_KEY`: Your Google AI API key

3. Never commit `.env` to git

4. For production deployment, set these as environment variables in your hosting platform.
