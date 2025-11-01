# schemas/user_profile.py
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any

class Publication(BaseModel):
    id: Optional[str] = None
    year: Optional[str] = None
    title: Optional[str] = None
    journal: Optional[str] = None
    citations: Optional[int] = 0
    impact: Optional[str] = None
    link: Optional[str] = None

class ProjectItem(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    status: Optional[str] = None
    collaborators: Optional[int] = 0
    completion: Optional[int] = 0
    description: Optional[str] = None
    funding: Optional[str] = None

class EducationItem(BaseModel):
    id: Optional[str] = None
    degree: Optional[str] = None
    institution: Optional[str] = None
    period: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    gpa: Optional[str] = None
    activities: Optional[List[str]] = []

class CertificationItem(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    issuer: Optional[str] = None
    issued: Optional[str] = None
    expires: Optional[str] = None
    credentialId: Optional[str] = None
    skills: Optional[List[str]] = []

class ExperienceItem(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    period: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    achievements: Optional[List[str]] = []

class LanguageItem(BaseModel):
    language: Optional[str] = None
    proficiency: Optional[str] = None

class VolunteerItem(BaseModel):
    role: Optional[str] = None
    organization: Optional[str] = None
    period: Optional[str] = None
    description: Optional[str] = None

class AchievementItem(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    organization: Optional[str] = None
    year: Optional[str] = None

class ProfileUpdate(BaseModel):
    name: Optional[str]
    domain: Optional[str]
    bio: Optional[str]
    institution: Optional[str]
    profile_pic_url: Optional[str]
    researchInterests: Optional[List[str]] = []
    publications: Optional[List[Publication]] = []
    projects: Optional[List[ProjectItem]] = []
    skills: Optional[List[dict]] = []  # {name, level}
    education: Optional[List[EducationItem]] = []
    certifications: Optional[List[CertificationItem]] = []
    experience: Optional[List[ExperienceItem]] = []
    languages: Optional[List[LanguageItem]] = []
    volunteer: Optional[List[VolunteerItem]] = []
    achievements: Optional[List[AchievementItem]] = []
