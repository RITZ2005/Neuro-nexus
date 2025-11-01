

=======
# 🔬 Open Science Nexus

> A collaborative research platform combining project management, document collaboration, and professional networking for researchers.

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-green.svg)](https://www.mongodb.com/)

---

## 🎯 Overview

**Open Science Nexus** is a comprehensive platform for research collaboration that combines:
- 📁 **Project Management** (like GitHub)
- 📝 **Document Collaboration** (like Google Docs)
- 🤝 **Professional Networking** (like LinkedIn)

Built specifically for researchers, with features like domain-specific feeds, version control for documents, and intelligent researcher matching.

---

## ✨ Features

### Phase 1: Project Management ✅
- **Projects**: Create, manage, and organize research projects
- **Invitations**: Invite collaborators via email
- **Members**: Manage team members and roles (owner, editor, viewer)
- **Notifications**: Real-time updates for invitations and project activities

### Phase 2: Document Management ✅
- **Rich Documents**: Create and edit documents with templates
- **Version Control**: Auto-save versions, create manual snapshots
- **Templates**: 6 predefined templates (Research Paper, Lab Report, Meeting Notes, etc.)
- **Restore**: Revert to any previous version

### Phase 3: Rich Text Editor ✅
- **Tiptap Editor**: Modern, fast rich text editing
- **Formatting Toolbar**: Bold, italic, underline, headings, lists, alignment, links
- **Character Count**: Track document length
- **Template Support**: Load templates with proper formatting

### Phase 4: Social Networking ✅ 🆕
- **Create Posts**: Share text, images, or links
- **Engagement**: Like and comment on posts
- **Domain Filtering**: See posts only from your research domain
- **User Discovery**: Find researchers based on domain and interests
- **Connection System**: Build your professional network
- **Match Scores**: See compatibility with other researchers
- **Notifications**: Get alerted for likes and comments

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- MongoDB 6+

### Backend Setup
```bash
cd research-collab-backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Create .env file with:
MONGO_URI=mongodb://localhost:27017
DB_NAME=research_collab
JWT_SECRET=your-secret-key-here

# Run backend
uvicorn main:app --reload
```

Backend runs at: http://localhost:8000  
API Docs: http://localhost:8000/docs

### Frontend Setup
```bash
# Install dependencies
npm install

# Run frontend
npm run dev
```

Frontend runs at: http://localhost:5173

### Seed Templates (Optional)
```bash
cd research-collab-backend
python seed_templates.py
```

---


---

## 🏗️ Architecture

### Tech Stack

**Backend:**
- FastAPI (Python 3.12)
- MongoDB with Motor (async driver)
- Pydantic v2 (validation)
- JWT authentication
- Python-multipart (file uploads)

**Frontend:**
- React 18+ with TypeScript
- Vite (build tool)
- Shadcn UI components
- Tailwind CSS
- Tiptap (rich text editor)
- Framer Motion (animations)
- React Router v6
- date-fns (date formatting)

**Database:**
- MongoDB 6+
- Collections: users, projects, documents, posts, notifications, publications

---

## 📊 API Endpoints

### Authentication (`/auth`)
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user

### Projects (`/projects`)
- `GET /projects` - List all projects
- `POST /projects` - Create project
- `GET /projects/{id}` - Get project
- `PUT /projects/{id}` - Update project
- `DELETE /projects/{id}` - Delete project
- `POST /projects/{id}/invite` - Invite member
- `POST /projects/{id}/remove-member` - Remove member

### Documents (`/documents`)
- `GET /documents/project/{project_id}` - List documents
- `POST /documents` - Create document
- `GET /documents/{id}` - Get document
- `PUT /documents/{id}` - Update document
- `DELETE /documents/{id}` - Delete document
- `GET /documents/{id}/versions` - Get version history
- `POST /documents/{id}/snapshot` - Create manual snapshot
- `POST /documents/{id}/restore/{version_id}` - Restore version

### Posts (`/posts`) 🆕
- `POST /posts/create` - Create post
- `GET /posts/feed` - Get domain-filtered feed
- `GET /posts/user/{user_id}` - Get user's posts
- `POST /posts/{id}/like` - Like/unlike post
- `POST /posts/{id}/comment` - Add comment
- `PUT /posts/{id}` - Update post
- `DELETE /posts/{id}` - Delete post

### Feed (`/feed`)
- `GET /feed/personalized` - Get personalized user feed
- `GET /feed/connections` - Get connections
- `GET /feed/suggestions` - Get connection suggestions
- `POST /feed/connect` - Send connection request
- `DELETE /feed/disconnect/{user_id}` - Disconnect

### Notifications (`/notifications`)
- `GET /notifications` - List notifications
- `PUT /notifications/{id}/read` - Mark as read
- `PUT /notifications/read-all` - Mark all as read

### Users (`/users`)
- `GET /users/profile` - Get own profile
- `PUT /users/profile` - Update profile
- `GET /users/{id}` - Get user by ID

---

## 🎨 UI Components

### Pages
- `LandingPage` - Marketing homepage
- `Dashboard` - User dashboard
- `Projects` - Project list
- `ProjectWorkspace` - Document editor
- `Feed` - Social feed with posts 🆕
- `Profile` - User profile
- `Notifications` - Notification center
- `Settings` - User settings

### Components
- `CreatePostDialog` - Modal for creating posts 🆕
- `PostCard` - Post display with engagement 🆕
- `CollaborativeEditor` - Tiptap rich text editor
- `EditorToolbar` - Formatting toolbar
- `ProjectChat` - Project chat (dormant)

---

## 🔐 Security

- **JWT Authentication**: Bearer token for all protected endpoints
- **Password Hashing**: bcrypt for secure password storage
- **Authorization**: Role-based access control (owner, editor, viewer)
- **Domain Filtering**: Privacy through domain-specific feeds
- **Input Validation**: Pydantic schemas for all requests
- **CORS**: Configured for localhost development

---

## 🗃️ Database Schema

### Users Collection
```javascript
{
  "_id": ObjectId,
  "name": String,
  "email": String (unique),
  "password": String (hashed),
  "domain": String,              // Research domain
  "institution": String,
  "bio": String,
  "avatar": String,
  "research_interests": [String],
  "skills": [String],
  "connections": [{
    "user_id": ObjectId,
    "status": String
  }],
  "created_at": DateTime
}
```

### Projects Collection
```javascript
{
  "_id": ObjectId,
  "name": String,
  "description": String,
  "owner_id": ObjectId,
  "members": [{
    "user_id": ObjectId,
    "role": String,              // owner, editor, viewer
    "added_at": DateTime
  }],
  "created_at": DateTime,
  "updated_at": DateTime
}
```

### Documents Collection
```javascript
{
  "_id": ObjectId,
  "project_id": ObjectId,
  "title": String,
  "content": String (HTML),
  "template_id": ObjectId,
  "created_by": ObjectId,
  "versions": [{
    "_id": ObjectId,
    "content": String,
    "version_number": Int,
    "created_at": DateTime,
    "description": String
  }],
  "created_at": DateTime,
  "updated_at": DateTime
}
```

### Posts Collection 🆕
```javascript
{
  "_id": ObjectId,
  "author_id": ObjectId,
  "author_name": String,
  "author_domain": String,       // For domain filtering
  "content": String,
  "post_type": String,           // text, image, link
  "media_url": String,
  "link_url": String,
  "tags": [String],
  "likes": [{
    "user_id": ObjectId,
    "created_at": DateTime
  }],
  "comments": [{
    "_id": ObjectId,
    "author_id": ObjectId,
    "author_name": String,
    "content": String,
    "created_at": DateTime
  }],
  "created_at": DateTime,
  "updated_at": DateTime
}
```

---

## 🧪 Testing

See [`TESTING_SOCIAL_FEED.md`](TESTING_SOCIAL_FEED.md) for comprehensive test scenarios.

**Quick Test:**
1. Start backend and frontend
2. Register/login
3. Create a post
4. Like and comment
5. Connect with other users
6. Check domain filtering

---

## 🛣️ Roadmap

### ✅ Completed
- [x] User authentication
- [x] Project management
- [x] Invitation system
- [x] Document CRUD
- [x] Version control
- [x] Template system
- [x] Rich text editor
- [x] Social posts
- [x] Like/comment system
- [x] Domain filtering
- [x] Connection system

### 🚧 In Progress
- [ ] Edit posts (backend ready)
- [ ] Delete comments (backend ready)
- [ ] Notification UI improvements

### 📋 Planned
- [ ] Post search and filtering
- [ ] Rich text in posts
- [ ] Image upload (not just URL)
- [ ] Mention users (@username)
- [ ] Share posts
- [ ] Real-time feed updates
- [ ] Private messaging
- [ ] Groups/communities
- [ ] Events system

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👥 Authors

- ** Ritesh Lokhande** - *Initial work*

---

## 🙏 Acknowledgments

- FastAPI for the amazing web framework
- Tiptap for the rich text editor
- Shadcn UI for beautiful components
- MongoDB for the flexible database
- All contributors and testers

---

## 📞 Support

- **Documentation**: See `/docs` folder
- **Issues**: GitHub Issues
- **Email**: riteshlokhande28@gmail.com

---

**Built with ❤️ for the research community**
>>>>>>> e634e94 (Update every feature)
