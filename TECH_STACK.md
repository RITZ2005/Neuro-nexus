# 🛠️ Tech Stack - Open Science Nexus

**Research Collaboration Platform with Blockchain Integration**

---

## 📱 Frontend Stack

### Core Framework
- **React 18+** - Modern UI library with hooks and functional components
- **TypeScript** - Type-safe JavaScript for better development experience
- **Vite** - Lightning-fast build tool and dev server

### UI & Styling
- **Tailwind CSS 3.x** - Utility-first CSS framework
- **Radix UI** - Unstyled, accessible component primitives
  - Dialog, Select, Button, ScrollArea, Tabs, Alert, Progress, Badge
- **Framer Motion** - Animation library for smooth transitions
- **Lucide React** - Beautiful, consistent icon set

### Rich Text Editing
- **Tiptap 2.26.3** - Headless editor framework
  - StarterKit, Image, Table, TaskList, CodeBlockLowlight
  - Highlight, Color, TextStyle, Subscript, Superscript
  - Custom Extensions: Mermaid diagrams, Math equations
- **Lowlight** - Syntax highlighting for code blocks
- **@tiptap-pro/extension-mathematics** - Math equation support

### LaTeX & Diagrams
- **react-latex-next 3.2.1** - LaTeX rendering
- **latex.js 0.12.6** - LaTeX to HTML conversion
- **Mermaid.js** - Diagram and flowchart generation
- **KaTeX** - Fast math typesetting

### State Management & Routing
- **React Router DOM** - Client-side routing
- **React Context API** - Global state management (Auth, Theme)
- **React Hooks** - Local state and side effects

### HTTP & WebSockets
- **Fetch API** - REST API calls with custom `apiGet`, `apiPost`, `apiPut`, `apiDelete`
- **WebSocket (native)** - Real-time collaboration for documents and chat

---

## ⚙️ Backend Stack

### Core Framework
- **FastAPI** - High-performance Python web framework
- **Uvicorn** - Lightning-fast ASGI server
- **Python 3.10+** - Modern Python with type hints

### Database
- **MongoDB** - NoSQL document database
  - Motor (async driver)
  - Collections: users, projects, documents, versions, chats, posts, publications

### Authentication & Security
- **JWT (JSON Web Tokens)** - Stateless authentication
- **Google OAuth 2.0** - Social authentication with Google accounts
- **@react-oauth/google** - React Google OAuth integration
- **google-auth** - Python Google OAuth verification
- **Passlib + bcrypt** - Password hashing
- **python-jose** - JWT token generation/validation
- **Cryptography (Fernet)** - File encryption for publications
- **PBKDF2HMAC** - Key derivation for encryption

### File Storage & IPFS
- **Pinata SDK** - IPFS (InterPlanetary File System) integration
- **Local File System** - Image uploads (profiles, posts)
- **Static File Serving** - FastAPI StaticFiles middleware

### WebSocket
- **FastAPI WebSockets** - Real-time bidirectional communication
- **ConnectionManager** - Custom WebSocket connection management

### Data Validation
- **Pydantic** - Data validation and settings management
- **BaseModel** - Schema definitions for all API models

---

## 🗄️ Database Schema

### Collections
```
users/
  - id, name, email, password_hash, bio, avatar, created_at

projects/
  - id, name, description, owner_id, members[], created_at, updated_at

documents/
  - id, title, content, project_id, document_type (tiptap/latex), 
    created_by, updated_by, version, created_at, updated_at

versions/
  - id, document_id, version_number, content, created_by, created_at, 
    change_summary

chats/
  - id, project_id, sender_id, message, created_at

posts/
  - id, user_id, content, image_url, likes[], comments[], created_at

publications/
  - id, title, description, domain, keywords[], ipfs_hash, key_hash,
    owner_id, file_size, file_type, access_count, status, created_at

connections/
  - id, requester_id, receiver_id, status (pending/accepted/rejected),
    created_at
```

---

## 🔐 Encryption & Blockchain

### Encryption
- **Algorithm**: AES-128 CBC (via Fernet)
- **Key Derivation**: PBKDF2HMAC with SHA256
- **Key Length**: 256-bit (32 bytes)
- **Encoding**: Base64 URL-safe

### IPFS Integration
- **Provider**: Pinata Cloud
- **Storage**: Encrypted files uploaded to IPFS
- **Access**: Decentralized, immutable document storage
- **Verification**: SHA256 hash of private keys

---

## 🎨 Design System

### Color Scheme
- **Primary**: Custom gradient (hero-gradient, accent-gradient)
- **Dark Mode**: Full dark theme support with CSS variables
- **Semantic Colors**: Success, Warning, Error, Info

### Typography
- **Primary Font**: System UI stack (Inter-like)
- **Code Font**: Monaco, Courier monospace
- **LaTeX Font**: Times New Roman, Georgia serif

### Animations
- **Framer Motion**: Page transitions, hover effects
- **CSS Transitions**: Smooth color changes, transforms
- **Loading States**: Spinners, progress bars, skeletons

---

## 📦 Key Dependencies

### Frontend (`package.json`)
```json
{
  "react": "^18.3.1",
  "react-router-dom": "^6.26.2",
  "typescript": "~5.6.2",
  "vite": "^5.4.8",
  "tailwindcss": "^3.4.1",
  "@radix-ui/*": "Various versions",
  "@tiptap/*": "^2.26.3",
  "@react-oauth/google": "Latest",
  "framer-motion": "^11.11.7",
  "react-latex-next": "^3.2.1",
  "latex.js": "^0.12.6",
  "lucide-react": "^0.451.0"
}
```

### Backend (`requirements.txt`)
```txt
fastapi
uvicorn[standard]
motor (MongoDB async driver)
pymongo
passlib[bcrypt]
python-jose[cryptography]
python-multipart
pydantic
cryptography
google-auth
google-auth-oauthlib
google-auth-httplib2
pinata-python-sdk
```

---

## 🌐 API Architecture

### REST Endpoints
```
/auth
  POST /register - User registration
  POST /login - User authentication
  POST /google - Google OAuth authentication
  GET /me - Get current user

/projects
  GET / - List user projects
  POST / - Create project
  GET /{id} - Get project details
  PUT /{id} - Update project
  DELETE /{id} - Delete project

/documents
  POST / or /create - Create document
  GET /project/{id} - List project documents
  GET /{id} - Get document
  PUT /{id} - Update document
  DELETE /{id} - Delete document

/versions
  GET /document/{id} - Get document versions
  POST /restore - Restore version

/chat
  GET /project/{id} - Get chat history
  POST / - Send message

/feed
  GET / - Get social feed
  POST / - Create post
  POST /{id}/like - Like post
  POST /{id}/comment - Comment on post

/publications
  POST /publish - Publish to IPFS
  POST /access - Decrypt and download
  POST /search - Search publications
  GET /my-publications - User's publications

/upload
  POST /image - Upload image
  DELETE /image/{filename} - Delete image

/connections
  GET / - List connections
  POST /request - Send connection request
  POST /respond - Accept/reject request
```

### WebSocket Endpoints
```
/ws/document/{document_id}/{user_id}
  - Real-time document collaboration

/ws/chat/{project_id}/{user_id}
  - Real-time project chat
```

---

## 🚀 Development Tools

### Build & Dev
- **Vite Dev Server** - `npm run dev` (Port 5173)
- **Uvicorn** - `uvicorn main:app --reload` (Port 8000)
- **TypeScript Compiler** - Type checking and transpilation
- **PostCSS** - CSS processing for Tailwind

### Code Quality
- **ESLint** - JavaScript/TypeScript linting
- **TypeScript** - Static type checking
- **Prettier** (implicit) - Code formatting

### Version Control
- **Git** - Source control
- **GitHub** - Remote repository hosting

---

## 📁 Project Structure

```
open-sci-nexus/
├── src/                          # Frontend source
│   ├── components/               # Reusable UI components
│   │   ├── editor/              # Tiptap & LaTeX editors
│   │   ├── feed/                # Social feed components
│   │   └── ui/                  # Radix UI wrappers
│   ├── pages/                   # Route pages
│   │   ├── Dashboard.tsx
│   │   ├── ProjectWorkspace.tsx
│   │   ├── Feed.tsx
│   │   ├── Publish.tsx
│   │   └── Profile.tsx
│   ├── contexts/                # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utilities
│   │   └── api.ts              # API client
│   └── main.tsx                # App entry point
│
├── research-collab-backend/      # Backend source
│   ├── routers/                 # API route handlers
│   │   ├── auth.py
│   │   ├── projects.py
│   │   ├── documents.py
│   │   ├── chat.py
│   │   ├── feed.py
│   │   ├── publications.py
│   │   └── upload.py
│   ├── schemas/                 # Pydantic models
│   ├── db/                      # Database connection
│   ├── core/                    # Security utilities
│   ├── utils/                   # Helpers
│   │   ├── encryption.py
│   │   └── pinata.py
│   ├── websocket/               # WebSocket handlers
│   ├── uploads/                 # File storage
│   └── main.py                 # FastAPI app
│
├── public/                      # Static assets
├── package.json                 # Frontend dependencies
├── requirements.txt             # Backend dependencies
├── vite.config.ts              # Vite configuration
├── tailwind.config.ts          # Tailwind configuration
└── tsconfig.json               # TypeScript configuration
```

---

## 🔄 Data Flow

### Document Collaboration
```
User Types → Tiptap Editor → WebSocket → Backend → MongoDB
                ↓                                      ↓
            Broadcast ← WebSocket ← Other Users ← Broadcast
```

### IPFS Publication
```
Upload File → Encrypt (Fernet) → Pinata IPFS → Store Metadata (MongoDB)
                ↓                                        ↓
         Private Key (SHA256) ← Return to User ← Publication ID
```

### Authentication Flow
```
Login Form → POST /auth/login → Validate Password → Generate JWT
                                                          ↓
                                              Store in localStorage
                                                          ↓
                                           Attach to API Requests
                                                          ↓
                                        Verify JWT → Access Protected Routes
```

---

## 🌟 Key Features by Tech

### Real-time Collaboration
- **WebSockets** - Live document editing
- **Tiptap** - Collaborative editing framework
- **React Context** - Shared state management

### Rich Content Creation
- **Tiptap Extensions** - 20+ formatting options
- **Mermaid** - Diagrams and flowcharts
- **KaTeX** - Mathematical equations
- **LaTeX** - Academic document creation

### Security & Privacy
- **JWT** - Stateless authentication
- **Bcrypt** - Password hashing
- **Fernet** - File encryption
- **IPFS** - Decentralized storage

### User Experience
- **Framer Motion** - Smooth animations
- **Radix UI** - Accessible components
- **Dark Mode** - Eye-friendly interface
- **Responsive Design** - Mobile-friendly

---

## 🔧 Configuration Files

### Frontend
- `vite.config.ts` - Vite bundler config
- `tailwind.config.ts` - Tailwind CSS config
- `tsconfig.json` - TypeScript compiler config
- `postcss.config.js` - PostCSS config
- `components.json` - shadcn/ui config

### Backend
- `main.py` - FastAPI app config
- `.env` (not in repo) - Environment variables
  - `MONGODB_URL`
  - `JWT_SECRET_KEY`
  - `PINATA_API_KEY`
  - `PINATA_API_SECRET`

---

## 🎯 Performance Optimizations

### Frontend
- **Code Splitting** - Vite automatic chunking
- **Lazy Loading** - React.lazy for routes
- **Debouncing** - LaTeX compilation (1s delay)
- **Memoization** - React.memo for expensive components

### Backend
- **Async/Await** - Non-blocking I/O with Motor
- **Connection Pooling** - MongoDB connection reuse
- **WebSocket Manager** - Efficient connection handling
- **Streaming Responses** - Large file downloads

---

## 📊 Browser Support

- **Chrome/Edge** - ✅ Full support (Chromium 90+)
- **Firefox** - ✅ Full support (88+)
- **Safari** - ✅ Full support (14+)
- **Mobile** - ✅ Responsive design

---

## 🚀 Deployment Ready

### Frontend Deployment
- **Vercel** - Recommended (Vite optimized)
- **Netlify** - Alternative option
- **Build**: `npm run build` → `dist/` folder

### Backend Deployment
- **Railway** - Recommended (FastAPI + MongoDB)
- **Heroku** - Alternative option
- **Docker** - Container-ready
- **Run**: `uvicorn main:app --host 0.0.0.0 --port 8000`

### Database Hosting
- **MongoDB Atlas** - Cloud MongoDB (Free tier available)

### IPFS Storage
- **Pinata Cloud** - Managed IPFS (Free tier: 1GB)

---

## 📈 Scalability

### Current Capacity
- **Users**: Unlimited (JWT stateless)
- **Documents**: MongoDB scalability
- **Files**: IPFS distributed storage
- **WebSockets**: ~1000 concurrent connections

### Future Enhancements
- Redis for session management
- Load balancer for multiple backend instances
- CDN for static assets
- Database sharding for large datasets

---

## 📚 Documentation

- `README.md` - Project overview
- `PHASE*.md` - Feature implementation guides (8 phases)
- `QUICK_START_*.md` - Feature-specific guides
- `BUGFIX_*.md` - Bug fix documentation
- `TECH_STACK.md` - This document

---

## 🤝 Contributing

### Development Workflow
1. Clone repository
2. Install dependencies:
   ```bash
   npm install                          # Frontend
   cd research-collab-backend
   pip install -r requirements.txt      # Backend
   ```
3. Setup environment variables (`.env`)
4. Run development servers:
   ```bash
   npm run dev                          # Frontend (port 5173)
   uvicorn main:app --reload            # Backend (port 8000)
   ```

---

## 📞 Support

- **GitHub Issues** - Bug reports and feature requests
- **Documentation** - Comprehensive guides in repo
- **Code Comments** - Inline documentation

---

**Built with ❤️ for Open Science**

Last Updated: October 16, 2025  
Version: 1.0.0
