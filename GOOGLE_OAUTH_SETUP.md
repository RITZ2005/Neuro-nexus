# 🔐 Google OAuth Setup Guide

## Quick Setup Instructions

### Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project**
   - Click "Select a project" → "New Project"
   - Project name: `Open Science Nexus` (or any name)
   - Click "Create"

### Step 2: Enable Google OAuth API

1. **Navigate to APIs & Services**
   - In the left menu: APIs & Services → Library

2. **Enable Google+ API**
   - Search for "Google+ API"
   - Click on it and click "Enable"

### Step 3: Configure OAuth Consent Screen

1. **Go to OAuth consent screen**
   - APIs & Services → OAuth consent screen

2. **Choose User Type**
   - Select "External" (for testing)
   - Click "Create"

3. **Fill App Information**
   - **App name**: Open Science Nexus
   - **User support email**: Your email
   - **Developer contact**: Your email
   - Click "Save and Continue"

4. **Scopes** (click "Save and Continue")
   - No additional scopes needed

5. **Test users** (Optional for development)
   - Add your Gmail accounts for testing
   - Click "Save and Continue"

### Step 4: Create OAuth Client ID

1. **Go to Credentials**
   - APIs & Services → Credentials

2. **Create Credentials**
   - Click "Create Credentials" → "OAuth client ID"

3. **Configure OAuth Client**
   - **Application type**: Web application
   - **Name**: Open Science Nexus Web Client

4. **Authorized JavaScript origins**
   Add these URLs:
   ```
   http://localhost:5173
   http://127.0.0.1:5173
   ```

5. **Authorized redirect URIs** (leave empty for now)

6. **Click "Create"**
   - You'll see your Client ID and Client Secret
   - **IMPORTANT**: Copy both values!

### Step 5: Configure Environment Variables

#### Backend (.env)
Open `research-collab-backend/.env` and add:

```env
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

#### Frontend (.env)
Open `.env` in the root folder and add:

```env
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
```

**Note**: Use the SAME Client ID for both!

---

## Testing Google OAuth

### 1. Start Backend Server
```bash
cd research-collab-backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start Frontend Server
```bash
npm run dev
```

### 3. Test Login
1. Go to http://localhost:5173/login
2. You should see:
   - Email/password form
   - "Or continue with" divider
   - Google Sign-In button

3. Click "Sign in with Google"
4. Choose your Google account
5. Grant permissions
6. You should be redirected to /dashboard

### 4. Test Signup
1. Go to http://localhost:5173/signup
2. Click "Sign up with Google"
3. Same flow as login

---

## How It Works

### Frontend Flow
```
User clicks Google button
      ↓
Google OAuth popup opens
      ↓
User selects account & grants permission
      ↓
Google returns credential token
      ↓
Frontend sends token to backend /auth/google
      ↓
Backend verifies token with Google
      ↓
Create/update user in MongoDB
      ↓
Return JWT token to frontend
      ↓
Store token & redirect to dashboard
```

### Backend Verification
1. Receives Google credential token
2. Verifies with Google servers using `google.oauth2.id_token.verify_oauth2_token()`
3. Extracts user info (email, name, picture, google_id)
4. Checks if user exists by email
5. Creates new user OR updates existing user
6. Returns JWT token for session management

---

## Security Features

### ✅ What's Secure
- Email must be verified by Google
- Token verification happens server-side
- No password storage for Google users
- JWT tokens for session management
- User data encrypted in MongoDB

### 🔒 Best Practices Implemented
1. **Token Verification**: Server verifies Google tokens, not client
2. **Email Verification**: Only verified Google emails allowed
3. **Unique Identification**: Google ID stored for future reference
4. **No Password Leaks**: Google auth users have NULL password_hash
5. **Session Management**: JWT tokens expire after 24 hours

---

## User Database Schema

### Google Auth Users
```javascript
{
  _id: ObjectId,
  name: "John Doe",
  email: "john@gmail.com",
  google_id: "1234567890",           // Unique Google identifier
  avatar: "https://...",              // Google profile picture
  domain: "General",                  // Can be updated later
  password_hash: null,                // No password for Google users
  email_verified: true,               // Verified by Google
  auth_provider: "google",            // Track auth method
  createdAt: ISODate
}
```

### Traditional Auth Users
```javascript
{
  _id: ObjectId,
  name: "Jane Smith",
  email: "jane@university.edu",
  google_id: null,                    // Can link Google later
  avatar: "custom_url",
  domain: "Computer Science",
  password_hash: "bcrypt_hash",       // Has password
  email_verified: false,              // Manual verification needed
  auth_provider: "email",
  createdAt: ISODate
}
```

---

## Troubleshooting

### Error: "Invalid Google token"
**Cause**: Client ID mismatch or expired token

**Fix**:
1. Verify GOOGLE_CLIENT_ID in both .env files matches
2. Ensure it's the same ID from Google Cloud Console
3. Check token expiration (Google tokens expire quickly)

### Error: "Email not verified by Google"
**Cause**: User's Google account email not verified

**Fix**:
1. Ask user to verify their Google email
2. They must confirm email in Gmail settings

### Google Button Not Showing
**Cause**: Missing VITE_GOOGLE_CLIENT_ID or wrong format

**Fix**:
1. Check `.env` file has correct Client ID
2. Restart dev server: `npm run dev`
3. Clear browser cache

### CORS Error
**Cause**: Domain not in authorized origins

**Fix**:
1. Go to Google Cloud Console
2. Credentials → Edit OAuth Client
3. Add http://localhost:5173 to Authorized JavaScript origins

### "Popup blocked"
**Cause**: Browser blocking OAuth popup

**Fix**:
1. Allow popups for localhost in browser settings
2. Or use "useOneTap" option (already enabled)

---

## Features Added

### Login Page
- ✅ Traditional email/password login
- ✅ Google Sign-In button
- ✅ "Or continue with" divider
- ✅ One-Tap sign in (automatic prompt)
- ✅ Loading states
- ✅ Toast notifications

### Signup Page
- ✅ Traditional registration form
- ✅ Google Sign-Up button
- ✅ Auto-fill from Google profile
- ✅ Domain selection (can skip with Google)
- ✅ Loading states
- ✅ Toast notifications

### Backend Endpoints
- ✅ POST /auth/google - Google OAuth handler
- ✅ Token verification
- ✅ User creation/update
- ✅ Profile picture from Google
- ✅ JWT token generation

---

## API Documentation

### POST /auth/google

**Request**:
```json
{
  "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Response** (Success):
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@gmail.com",
    "domain": "General"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

**Response** (Error - Email not verified):
```json
{
  "detail": "Email not verified by Google"
}
```

**Response** (Error - Invalid token):
```json
{
  "detail": "Invalid Google token"
}
```

---

## Frontend Components

### GoogleLogin Button Props
```tsx
<GoogleLogin
  onSuccess={handleGoogleSuccess}
  onError={handleGoogleError}
  useOneTap                    // Auto-prompt on page load
  theme="outline"              // Button style
  size="large"                 // Button size
  text="signin_with"           // Button text
  shape="rectangular"          // Button shape
/>
```

### Customization Options
- **theme**: "outline" | "filled_blue" | "filled_black"
- **size**: "large" | "medium" | "small"
- **text**: "signin_with" | "signup_with" | "continue_with"
- **shape**: "rectangular" | "pill" | "circle"

---

## Production Deployment

### Before Going Live

1. **Update OAuth Consent Screen**
   - Change to "Production" user type
   - Submit for Google verification

2. **Add Production URLs**
   - Add your production domain to authorized origins
   - Example: `https://your-domain.com`

3. **Environment Variables**
   - Use production Client ID/Secret
   - Store securely (never commit to Git)

4. **SSL/HTTPS Required**
   - Google OAuth requires HTTPS in production
   - Use Let's Encrypt or Cloudflare

---

## Cost & Limits

### Google OAuth
- ✅ **FREE** for up to 100,000 users
- ✅ No API quotas for authentication
- ✅ Unlimited sign-ins

### What You Need
- Google Account (free)
- Google Cloud Project (free)
- No credit card required for OAuth

---

## Security Checklist

- [x] Token verification on server-side
- [x] Email verification required
- [x] HTTPS in production
- [x] Client ID in authorized origins
- [x] Environment variables not in Git
- [x] JWT tokens with expiration
- [x] No passwords stored for Google users
- [x] User data in MongoDB encrypted

---

## Next Steps

### Optional Enhancements
1. **Link Google to Existing Account**
   - Allow users with email/password to link Google

2. **Multiple Auth Providers**
   - Add GitHub OAuth
   - Add Microsoft OAuth

3. **Profile Completion**
   - Prompt for research domain after Google sign-up
   - Update profile with missing info

4. **Email Verification**
   - Send verification emails for non-Google users
   - Match Google's verified status

---

## Support

### Google OAuth Documentation
- https://developers.google.com/identity/protocols/oauth2
- https://console.cloud.google.com/

### Library Documentation
- **Frontend**: https://www.npmjs.com/package/@react-oauth/google
- **Backend**: https://google-auth.readthedocs.io/

### Common Issues
- Stack Overflow: [google-oauth] tag
- GitHub Issues: @react-oauth/google repo

---

**Last Updated**: November 1, 2025
**Status**: ✅ Ready for Testing
**Version**: 1.0.0
