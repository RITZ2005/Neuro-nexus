# main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
 
load_dotenv()

from routers import auth, users, projects, documents, publications, feed, notifications, websocket_routes, chat, posts, upload
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI(title="Research Collaboration Backend")

# Mount static files for uploaded images
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

origins = [
    "http://localhost:5173",  # Vite dev server default
    "http://127.0.0.1:5173",
    "http://localhost:8080",  # Alternative port
    "http://127.0.0.1:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(publications.router)
app.include_router(feed.router)
app.include_router(notifications.router)
app.include_router(posts.router)
app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(websocket_routes.router)

@app.get("/")
async def root():
    return {"message": "Backend running"}
