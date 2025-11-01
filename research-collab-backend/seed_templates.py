# seed_templates.py
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DB_NAME", "research_collab")  # Fixed: use DB_NAME to match backend

# Predefined templates
PREDEFINED_TEMPLATES = [
    {
        "title": "Research Paper",
        "description": "Standard academic research paper template with abstract, introduction, methodology, results, and conclusion sections",
        "category": "research",
        "content": """<h1>Research Paper Title</h1><p></p><h2>Abstract</h2><p>[Write a brief summary of your research, including objectives, methods, key findings, and conclusions]</p><p></p><h2>1. Introduction</h2><h3>1.1 Background</h3><p>[Provide context and background information]</p><p></p><h3>1.2 Research Problem</h3><p>[Clearly state the problem you're addressing]</p><p></p><h3>1.3 Objectives</h3><ul><li><p>[Objective 1]</p></li><li><p>[Objective 2]</p></li><li><p>[Objective 3]</p></li></ul><p></p><h2>2. Literature Review</h2><p>[Review relevant existing research and theories]</p><p></p><h2>3. Methodology</h2><h3>3.1 Research Design</h3><p>[Describe your research approach]</p><p></p><h3>3.2 Data Collection</h3><p>[Explain how data was collected]</p><p></p><h3>3.3 Analysis Methods</h3><p>[Describe analysis techniques]</p><p></p><h2>4. Results</h2><p>[Present your findings with data, tables, and figures]</p><p></p><h2>5. Discussion</h2><p>[Interpret results and discuss implications]</p><p></p><h2>6. Conclusion</h2><p>[Summarize key findings and future research directions]</p><p></p><h2>References</h2><ul><li><p>[Reference 1]</p></li><li><p>[Reference 2]</p></li><li><p>[Reference 3]</p></li></ul>""",
        "is_predefined": True
    },
    {
        "title": "Lab Report",
        "description": "Laboratory experiment report template with objectives, procedure, observations, and analysis",
        "category": "lab",
        "content": """<h1>Lab Report: [Experiment Name]</h1><p></p><p><strong>Date:</strong> [Date]</p><p><strong>Experimenter(s):</strong> [Names]</p><p><strong>Lab Partner(s):</strong> [Names]</p><p></p><h2>Objective</h2><p>[State the purpose and goals of the experiment]</p><p></p><h2>Theory/Background</h2><p>[Provide relevant scientific principles and concepts]</p><p></p><h2>Materials and Equipment</h2><ul><li><p>[Item 1]</p></li><li><p>[Item 2]</p></li><li><p>[Item 3]</p></li></ul><p></p><h2>Procedure</h2><ol><li><p>[Step 1]</p></li><li><p>[Step 2]</p></li><li><p>[Step 3]</p></li></ol><p></p><h2>Observations</h2><p>[Record what you observed during the experiment]</p><p></p><h2>Data and Results</h2><p>[Present collected data in tables/graphs]</p><p></p><h2>Calculations</h2><p>[Show all calculations with formulas]</p><p></p><h2>Analysis</h2><p>[Interpret the results and explain patterns]</p><p></p><h2>Sources of Error</h2><p>[Identify potential errors and their impact]</p><p></p><h2>Conclusion</h2><p>[Summarize findings and relate back to objectives]</p><p></p><h2>References</h2><ul><li><p>[Source 1]</p></li><li><p>[Source 2]</p></li></ul>""",
        "is_predefined": True
    },
    {
        "title": "Meeting Notes",
        "description": "Structured template for recording meeting discussions, decisions, and action items",
        "category": "meeting",
        "content": """<h1>Meeting Notes: [Meeting Title]</h1><p></p><p><strong>Date:</strong> [Date]</p><p><strong>Time:</strong> [Start Time] - [End Time]</p><p><strong>Location:</strong> [Physical/Virtual Location]</p><p><strong>Attendees:</strong> [List all participants]</p><p><strong>Note Taker:</strong> [Name]</p><p></p><h2>Agenda</h2><ol><li><p>[Topic 1]</p></li><li><p>[Topic 2]</p></li><li><p>[Topic 3]</p></li></ol><p></p><h2>Discussion Summary</h2><p></p><h3>[Topic 1]</h3><p><strong>Discussion:</strong></p><p>[Key points discussed]</p><p></p><p><strong>Decisions Made:</strong></p><ul><li><p>[Decision 1]</p></li><li><p>[Decision 2]</p></li></ul><p></p><h3>[Topic 2]</h3><p><strong>Discussion:</strong></p><p>[Key points discussed]</p><p></p><p><strong>Decisions Made:</strong></p><ul><li><p>[Decision 1]</p></li></ul><p></p><h2>Action Items</h2><p>[Action 1] - Owner: [Name] - Deadline: [Date] - Status: Pending</p><p>[Action 2] - Owner: [Name] - Deadline: [Date] - Status: Pending</p><p></p><h2>Next Meeting</h2><p><strong>Date:</strong> [Date]</p><p><strong>Time:</strong> [Time]</p><p><strong>Agenda Items:</strong></p><ul><li><p>[Item 1]</p></li><li><p>[Item 2]</p></li></ul><p></p><h2>Additional Notes</h2><p>[Any other relevant information]</p>""",
        "is_predefined": True
    },
    {
        "title": "Project Proposal",
        "description": "Template for writing project proposals with problem statement, methodology, and expected outcomes",
        "category": "research",
        "content": """<h1>Project Proposal: [Project Title]</h1><p></p><p><strong>Submitted by:</strong> [Name/Team]</p><p><strong>Date:</strong> [Date]</p><p><strong>Institution/Organization:</strong> [Name]</p><p></p><h2>Executive Summary</h2><p>[Brief overview of the entire proposal - write this last]</p><p></p><h2>1. Problem Statement</h2><p>[Clearly define the problem or need being addressed]</p><p></p><h2>2. Background and Significance</h2><p>[Explain why this project matters]</p><p></p><h2>3. Project Goals and Objectives</h2><p><strong>Overall Goal:</strong></p><p>[Main goal of the project]</p><p></p><p><strong>Specific Objectives:</strong></p><ol><li><p>[Objective 1]</p></li><li><p>[Objective 2]</p></li><li><p>[Objective 3]</p></li></ol><p></p><h2>4. Methodology</h2><h3>4.1 Approach</h3><p>[Describe your overall approach]</p><p></p><h3>4.2 Timeline</h3><p><strong>Phase 1:</strong> [Activities] - [Duration]</p><p><strong>Phase 2:</strong> [Activities] - [Duration]</p><p><strong>Phase 3:</strong> [Activities] - [Duration]</p><p></p><h3>4.3 Resources Required</h3><ul><li><p><strong>Personnel:</strong> [List team members and roles]</p></li><li><p><strong>Equipment:</strong> [List required equipment]</p></li><li><p><strong>Budget:</strong> [Estimated costs]</p></li></ul><p></p><h2>5. Expected Outcomes</h2><p>[Describe anticipated results and deliverables]</p><p></p><h2>6. Impact and Benefits</h2><p>[Explain the potential impact]</p><p></p><h2>7. Risk Assessment</h2><p><strong>Risk 1:</strong> [Description] - Likelihood: [Low/Med/High] - Impact: [Low/Med/High] - Mitigation: [Strategy]</p><p><strong>Risk 2:</strong> [Description] - Likelihood: [Low/Med/High] - Impact: [Low/Med/High] - Mitigation: [Strategy]</p><p></p><h2>8. Evaluation Metrics</h2><p>[How will success be measured?]</p><p></p><h2>9. Budget</h2><p>[Detailed budget breakdown if applicable]</p><p></p><h2>10. Conclusion</h2><p>[Summarize why this project should be approved]</p><p></p><h2>References</h2><ul><li><p>[Reference 1]</p></li><li><p>[Reference 2]</p></li></ul>""",
        "is_predefined": True
    },
    {
        "title": "Literature Review",
        "description": "Template for organizing and writing a comprehensive literature review",
        "category": "research",
        "content": """<h1>Literature Review: [Topic]</h1><p></p><p><strong>Author:</strong> [Your Name]</p><p><strong>Date:</strong> [Date]</p><p></p><h2>1. Introduction</h2><p>[Introduce the topic and scope of the literature review]</p><p></p><h2>2. Search Strategy</h2><p><strong>Databases Used:</strong></p><ul><li><p>[Database 1]</p></li><li><p>[Database 2]</p></li></ul><p></p><p><strong>Keywords:</strong></p><ul><li><p>[Keyword 1]</p></li><li><p>[Keyword 2]</p></li></ul><p></p><p><strong>Inclusion/Exclusion Criteria:</strong></p><p>[Define what studies were included/excluded and why]</p><p></p><h2>3. Thematic Analysis</h2><p></p><h3>Theme 1: [Theme Name]</h3><p><strong>Key Findings:</strong></p><p>[Summarize major findings from multiple sources]</p><p></p><p><strong>Notable Studies:</strong></p><ul><li><p>[Author et al., Year] - [Brief summary]</p></li><li><p>[Author et al., Year] - [Brief summary]</p></li></ul><p></p><h3>Theme 2: [Theme Name]</h3><p><strong>Key Findings:</strong></p><p>[Summarize major findings]</p><p></p><p><strong>Notable Studies:</strong></p><ul><li><p>[Author et al., Year] - [Brief summary]</p></li></ul><p></p><h2>4. Research Gaps</h2><p>[Identify what has not been studied or needs further investigation]</p><p></p><h2>5. Synthesis and Critical Analysis</h2><p>[Critically analyze the body of literature]</p><p></p><h2>6. Conclusion</h2><p>[Summarize key insights and implications for your research]</p><p></p><h2>7. References</h2><ul><li><p>[Reference 1]</p></li><li><p>[Reference 2]</p></li><li><p>[Reference 3]</p></li></ul>""",
        "is_predefined": True
    },
    {
        "title": "Blank Document",
        "description": "Simple blank document to start from scratch",
        "category": "general",
        "content": "",
        "is_predefined": True
    }
]

async def seed_templates():
    """Seed predefined templates into the database"""
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DATABASE_NAME]
    
    try:
        # Check if templates already exist
        existing_count = await db.templates.count_documents({"is_predefined": True})
        
        if existing_count > 0:
            print(f"⚠️  Found {existing_count} existing predefined templates.")
            response = input("Do you want to replace them? (yes/no): ")
            if response.lower() != 'yes':
                print("❌ Seeding cancelled.")
                return
            
            # Delete existing predefined templates
            result = await db.templates.delete_many({"is_predefined": True})
            print(f"🗑️  Deleted {result.deleted_count} existing templates.")
        
        # Insert predefined templates
        templates_to_insert = []
        for template in PREDEFINED_TEMPLATES:
            template["created_at"] = datetime.now(timezone.utc)
            templates_to_insert.append(template)
        
        result = await db.templates.insert_many(templates_to_insert)
        print(f"✅ Successfully seeded {len(result.inserted_ids)} predefined templates!")
        
        # List inserted templates
        print("\n📋 Inserted Templates:")
        for i, template in enumerate(PREDEFINED_TEMPLATES, 1):
            print(f"   {i}. {template['title']} ({template['category']})")
        
    except Exception as e:
        print(f"❌ Error seeding templates: {str(e)}")
    finally:
        client.close()

if __name__ == "__main__":
    print("🌱 Seeding predefined templates...\n")
    asyncio.run(seed_templates())
