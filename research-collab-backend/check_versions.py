import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

async def check_versions():
    client = AsyncIOMotorClient(os.getenv('MONGO_URI', 'mongodb://localhost:27017'))
    db = client[os.getenv('DB_NAME', 'research_collab')]
    
    print("🔍 Checking document versions timestamps...\n")
    
    # Get all document versions
    versions = await db.document_versions.find({}).sort("created_at", -1).to_list(20)
    
    if len(versions) == 0:
        print("❌ No versions found in database")
    else:
        print(f"📋 Found {len(versions)} versions:\n")
        for v in versions:
            doc_id = v.get('document_id')
            version = v.get('version')
            created_at = v.get('created_at')
            change_desc = v.get('change_description', 'No description')
            
            # Calculate time difference
            if created_at:
                now = datetime.utcnow()
                diff = now - created_at
                hours_ago = diff.total_seconds() / 3600
                
                print(f"  📄 Document: {doc_id}")
                print(f"     Version: v{version}")
                print(f"     Timestamp: {created_at} (UTC)")
                print(f"     Time ago: {hours_ago:.1f} hours")
                print(f"     Description: {change_desc}")
                print()
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_versions())
