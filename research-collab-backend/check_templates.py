import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check_templates():
    client = AsyncIOMotorClient(os.getenv('MONGO_URI', 'mongodb://localhost:27017'))
    db = client[os.getenv('DB_NAME', 'research_collab')]  # Fixed: use DB_NAME to match backend
    
    print("🔍 Checking MongoDB connection...")
    print(f"URI: {os.getenv('MONGO_URI', 'mongodb://localhost:27017')}")
    print(f"Database: {os.getenv('DB_NAME', 'research_collab')}\n")
    
    # Check collections
    collections = await db.list_collection_names()
    print(f"📂 Collections in database: {collections}\n")
    
    if 'templates' not in collections:
        print("❌ 'templates' collection does not exist!")
        print("Run: python seed_templates.py")
        client.close()
        return
    
    templates = await db.templates.find({}).to_list(100)
    print(f'📋 Templates found: {len(templates)}\n')
    
    if len(templates) == 0:
        print("❌ No templates in database!")
        print("Run: python seed_templates.py")
    else:
        for t in templates:
            print(f"  ✅ {t.get('title')}")
            print(f"     ID: {t.get('_id')}")
            print(f"     Category: {t.get('category')}")
            print(f"     Predefined: {t.get('is_predefined')}")
            print(f"     Created: {t.get('created_at')}")
            print()
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_templates())
