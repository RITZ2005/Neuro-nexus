import asyncio
from db.mongo import db

async def setup_indexes():
    """
    Create indexes on users collection for optimal feed performance
    """
    print("Setting up database indexes...")
    
    # Create index on domain field for fast domain-based queries
    result1 = await db.users.create_index("domain")
    print(f"✓ Created index on 'domain': {result1}")
    
    # Create index on research_interests for matching queries
    result2 = await db.users.create_index("research_interests")
    print(f"✓ Created index on 'research_interests': {result2}")
    
    # Create index on skills for matching queries
    result3 = await db.users.create_index("skills")
    print(f"✓ Created index on 'skills': {result3}")
    
    # Create compound index for common queries
    result4 = await db.users.create_index([("domain", 1), ("research_interests", 1)])
    print(f"✓ Created compound index on 'domain' + 'research_interests': {result4}")
    
    # List all indexes
    indexes = await db.users.index_information()
    print(f"\nAll indexes on 'users' collection:")
    for name, details in indexes.items():
        print(f"  - {name}: {details.get('key')}")
    
    print("\n✅ Database indexes setup complete!")

if __name__ == "__main__":
    asyncio.run(setup_indexes())
