# 🔒 Security & Environment Setup Guide

## ⚠️ IMPORTANT: Protecting Your Secrets

Your project contains sensitive information that should **NEVER** be committed to GitHub:
- API keys (Pinata, Google OAuth)
- Database credentials
- JWT secret keys
- OAuth client secrets

## ✅ What's Protected

The `.gitignore` file now protects:

### 🔑 Environment Files
- `.env` (frontend)
- `research-collab-backend/.env` (backend)
- All `.env.*` variations

### 📁 Sensitive Directories
- `research-collab-backend/uploads/*` (user uploaded files)
- `node_modules/` (dependencies)
- `__pycache__/` (Python cache)
- `venv/` or `env/` (Python virtual environments)

### 🗝️ Credential Files
- `*secret*.txt`, `*secret*.json`
- `*key*.txt`, `*key*.json`
- `*credentials*.txt`, `*credentials*.json`
- `*.pem`, `*.key`, `*.crt` (SSL certificates)

## 📋 Setup Instructions for New Developers

### 1. Clone the Repository
```bash
git clone https://github.com/RITZ2005/open-sci-nexus.git
cd open-sci-nexus
```

### 2. Setup Frontend Environment
```bash
# Copy example file
cp .env.example .env

# Edit .env and add your actual values
# - VITE_GOOGLE_CLIENT_ID
# - VITE_SUPABASE_* (if using Supabase)
```

### 3. Setup Backend Environment
```bash
cd research-collab-backend

# Copy example file
cp .env.example .env

# Edit .env and add your actual values:
# - MONGO_URI (MongoDB connection string)
# - JWT_SECRET (generate a secure random string)
# - PINATA_API_KEY and PINATA_API_SECRET
# - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
```

### 4. Generate JWT Secret
```bash
# Run this in Python to generate a secure secret
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Copy the output to JWT_SECRET in your .env file
```

### 5. Install Dependencies
```bash
# Frontend
npm install

# Backend
cd research-collab-backend
pip install -r requirements.txt
```

### 6. Start Development Servers
```bash
# Frontend (from root)
npm run dev

# Backend (from research-collab-backend)
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 🔐 Getting API Keys

### Google OAuth Credentials
1. Go to: https://console.cloud.google.com/
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 Client ID
5. Add `http://localhost:5173` to authorized origins
6. Copy Client ID and Client Secret

### Pinata IPFS Credentials
1. Go to: https://app.pinata.cloud/
2. Sign up for free account
3. Go to API Keys section
4. Create new key with admin permissions
5. Copy API Key and Secret

### MongoDB
1. **Local**: Use `mongodb://localhost:27017`
2. **Cloud (MongoDB Atlas)**:
   - Go to: https://cloud.mongodb.com/
   - Create free cluster
   - Get connection string
   - Replace in MONGO_URI

## ⚡ Quick Reference: Environment Variables

### Frontend (.env)
```env
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=xxx
```

### Backend (research-collab-backend/.env)
```env
MONGO_URI=mongodb://localhost:27017
DB_NAME=research_collab
JWT_SECRET=your_32_char_random_string
PINATA_API_KEY=xxx
PINATA_API_SECRET=xxx
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
```

## 🚨 Security Checklist

Before committing code:
- [ ] `.env` files are in `.gitignore`
- [ ] No hardcoded API keys in source code
- [ ] No passwords in comments
- [ ] No sensitive data in console.logs
- [ ] `.env.example` contains only placeholder values

## 🔍 Check for Accidentally Committed Secrets

```bash
# Check if .env is tracked (should show nothing)
git ls-files | grep .env

# Check for any secrets in history (optional)
git log --all --full-history --source --patch -S"PINATA_API_KEY"
```

## 🛡️ If You Accidentally Commit Secrets

### Immediate Actions:
1. **Revoke/Regenerate all exposed keys immediately**
   - Google OAuth: Delete and create new credentials
   - Pinata: Revoke API key and create new one
   - JWT Secret: Generate new secret

2. **Remove from Git history** (if not pushed yet):
```bash
# Remove last commit
git reset --soft HEAD~1

# Or amend last commit
git commit --amend
```

3. **If already pushed to GitHub**:
   - Revoke keys IMMEDIATELY
   - Contact GitHub support if sensitive
   - Use git-filter-branch to remove from history (advanced)

## 📝 Best Practices

### DO ✅
- Use `.env.example` for documentation
- Generate strong JWT secrets (32+ characters)
- Use environment variables for all secrets
- Keep `.env` files local only
- Regularly rotate API keys
- Use different keys for dev/staging/production

### DON'T ❌
- Commit `.env` files to Git
- Share secrets via email/chat
- Hardcode API keys in source code
- Use production keys in development
- Reuse secrets across projects
- Store secrets in documentation

## 🔄 Rotating Secrets

When to rotate:
- Every 90 days (recommended)
- When team member leaves
- After suspected compromise
- Before major releases

How to rotate:
1. Generate new credentials
2. Update all `.env` files
3. Restart all services
4. Revoke old credentials
5. Test thoroughly

## 📚 Additional Resources

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [12 Factor App - Config](https://12factor.net/config)
- [dotenv Documentation](https://github.com/motdotla/dotenv)

## 🆘 Need Help?

If you accidentally committed secrets:
1. **Act fast** - revoke immediately
2. Check GitHub Security tab for alerts
3. Generate new credentials
4. Update deployment environments

---

**Remember**: It takes one mistake to expose secrets, but following these practices keeps your project secure! 🔐

**Last Updated**: November 1, 2025
