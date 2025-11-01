import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Building, BookOpen, FileText, Briefcase, 
  Award, GraduationCap, Globe, Heart, Trophy, Edit, Save, X, 
  Plus, Trash2, Eye, Users, TrendingUp, MapPin, Calendar, Link as LinkIcon, Camera
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ImageUpload } from '@/components/ui/image-upload';
import { apiGet, apiPut } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Type definitions
interface Publication {
  id?: string;
  year?: string;
  title?: string;
  journal?: string;
  citations?: number;
  impact?: string;
  link?: string;
}

interface ProjectItem {
  id?: string;
  title?: string;
  status?: string;
  collaborators?: number;
  completion?: number;
  description?: string;
  funding?: string;
}

interface EducationItem {
  id?: string;
  degree?: string;
  institution?: string;
  period?: string;
  location?: string;
  description?: string;
  gpa?: string;
  activities?: string[];
}

interface CertificationItem {
  id?: string;
  title?: string;
  issuer?: string;
  issued?: string;
  expires?: string;
  credentialId?: string;
  skills?: string[];
}

interface ExperienceItem {
  id?: string;
  title?: string;
  company?: string;
  period?: string;
  location?: string;
  type?: string;
  description?: string;
  achievements?: string[];
}

interface LanguageItem {
  language?: string;
  proficiency?: string;
}

interface VolunteerItem {
  role?: string;
  organization?: string;
  period?: string;
  description?: string;
}

interface AchievementItem {
  id?: string;
  title?: string;
  organization?: string;
  year?: string;
}

interface SkillItem {
  name: string;
  level: number;
}

interface ProfileData {
  id: string;
  name: string;
  email: string;
  domain?: string;
  bio?: string;
  institution?: string;
  profile_pic_url?: string;
  researchInterests: string[];
  publications: Publication[];
  projects: ProjectItem[];
  skills: SkillItem[];
  education: EducationItem[];
  certifications: CertificationItem[];
  experience: ExperienceItem[];
  languages: LanguageItem[];
  volunteer: VolunteerItem[];
  achievements: AchievementItem[];
}

// Profile Picture Upload Dialog Component
const ProfilePictureUploadDialog: React.FC<{
  currentUrl?: string;
  onUpdate: (url: string) => void;
}> = ({ currentUrl, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const [newProfilePic, setNewProfilePic] = useState(currentUrl || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiPut('/users/me', { profile_pic_url: newProfilePic });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to update profile picture');
      }
      
      const updated = await res.json();
      onUpdate(updated.profile_pic_url);
      
      toast({
        title: "Success",
        description: "Profile picture updated successfully!",
      });
      
      setOpen(false);
    } catch (error) {
      console.error('Error updating profile picture:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile picture",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-0 right-0 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Camera className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Profile Picture</DialogTitle>
          <DialogDescription>
            Upload a new profile picture. Recommended size: 400x400px
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <ImageUpload
              value={newProfilePic}
              onChange={setNewProfilePic}
              onRemove={() => setNewProfilePic('')}
              imageType="profile"
              aspectRatio="square"
            />
            <p className="text-xs text-muted-foreground">
              Upload an image from your computer (max 10MB, square format recommended)
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !newProfilePic}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData>({
    id: '',
    name: '',
    email: '',
    domain: '',
    bio: '',
    institution: '',
    profile_pic_url: '',
    researchInterests: [],
    publications: [],
    projects: [],
    skills: [],
    education: [],
    certifications: [],
    experience: [],
    languages: [],
    volunteer: [],
    achievements: [],
  });

  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [tempData, setTempData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await apiGet('/users/me');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        alert('Failed to load profile');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (section: string, data: any) => {
    setEditingSection(section);
    setTempData(JSON.parse(JSON.stringify(data))); // Deep clone
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setTempData(null);
  };

  const saveSection = async (section: string, data: any) => {
    setSaving(true);
    try {
      const updatePayload: any = {};
      updatePayload[section] = data;

      const res = await apiPut('/users/me', updatePayload);
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to update profile');
        return;
      }
      const updated = await res.json();
      setProfile(updated);
      setEditingSection(null);
      setTempData(null);
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-8">
      {/* Profile Header Card */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          {/* Cover Image Area */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-lg"></div>
          
          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-16 mb-4">
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-background">
                  <AvatarImage src={profile.profile_pic_url} alt={profile.name} />
                  <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                    {profile.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <ProfilePictureUploadDialog 
                  currentUrl={profile.profile_pic_url} 
                  onUpdate={(url) => {
                    setProfile({ ...profile, profile_pic_url: url });
                  }} 
                />
              </div>
              
              <div className="flex-1 mt-16 md:mt-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-bold">{profile.name}</h1>
                    {profile.domain && (
                      <p className="text-lg text-muted-foreground">{profile.domain}</p>
                    )}
                    {profile.institution && (
                      <p className="text-sm text-muted-foreground flex items-center mt-1">
                        <Building className="w-4 h-4 mr-1" />
                        {profile.institution}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground flex items-center mt-1">
                      <Mail className="w-4 h-4 mr-1" />
                      {profile.email}
                    </p>
                  </div>
                  <Button onClick={() => startEdit('basic', {
                    name: profile.name,
                    domain: profile.domain,
                    bio: profile.bio,
                    institution: profile.institution
                  })}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Bio */}
            {profile.bio && (
              <div className="mt-4">
                <h3 className="font-semibold text-lg mb-2">About</h3>
                <p className="text-muted-foreground">{profile.bio}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Research Interests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center">
            <BookOpen className="w-5 h-5 mr-2" />
            Research Interests
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => startEdit('researchInterests', profile.researchInterests)}>
            <Edit className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {editingSection === 'researchInterests' ? (
            <div className="space-y-4">
              {tempData.map((interest: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={interest}
                    onChange={(e) => {
                      const newData = [...tempData];
                      newData[index] = e.target.value;
                      setTempData(newData);
                    }}
                    placeholder="Enter research interest"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setTempData(tempData.filter((_: any, i: number) => i !== index))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTempData([...tempData, ''])}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Interest
                </Button>
                <Button onClick={() => saveSection('researchInterests', tempData)} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.researchInterests.length > 0 ? (
                profile.researchInterests.map((interest, i) => (
                  <Badge key={i} variant="secondary" className="text-sm">{interest}</Badge>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No research interests added yet</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center">
            <Award className="w-5 h-5 mr-2" />
            Skills
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => startEdit('skills', profile.skills)}>
            <Edit className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {editingSection === 'skills' ? (
            <div className="space-y-4">
              {tempData.map((skill: SkillItem, index: number) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div>
                    <Label>Skill Name</Label>
                    <Input
                      value={skill.name}
                      onChange={(e) => {
                        const newData = [...tempData];
                        newData[index].name = e.target.value;
                        setTempData(newData);
                      }}
                      placeholder="e.g., Python, Machine Learning"
                    />
                  </div>
                  <div>
                    <Label>Proficiency: {skill.level}%</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={skill.level}
                      onChange={(e) => {
                        const newData = [...tempData];
                        newData[index].level = parseInt(e.target.value);
                        setTempData(newData);
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setTempData(tempData.filter((_: any, i: number) => i !== index))}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTempData([...tempData, { name: '', level: 50 }])}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Skill
                </Button>
                <Button onClick={() => saveSection('skills', tempData)} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.skills.length > 0 ? (
                profile.skills.map((skill, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{skill.name}</span>
                      <span className="text-muted-foreground">{skill.level}%</span>
                    </div>
                    <Progress value={skill.level} className="h-2" />
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm col-span-2">No skills added yet</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Experience Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center">
            <Briefcase className="w-5 h-5 mr-2" />
            Experience
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => startEdit('experience', profile.experience)}>
            <Edit className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {editingSection === 'experience' ? (
            <div className="space-y-6">
              {tempData.map((exp: ExperienceItem, idx: number) => (
                <div key={idx} className="p-4 border rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Job Title</Label>
                      <Input value={exp.title || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].title = e.target.value; setTempData(newData); }} placeholder="e.g., Research Scientist" />
                    </div>
                    <div>
                      <Label>Company</Label>
                      <Input value={exp.company || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].company = e.target.value; setTempData(newData); }} placeholder="e.g., Google Research" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Period</Label>
                      <Input value={exp.period || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].period = e.target.value; setTempData(newData); }} placeholder="e.g., 2020 - Present" />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input value={exp.location || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].location = e.target.value; setTempData(newData); }} placeholder="e.g., San Francisco, CA" />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Input value={exp.type || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].type = e.target.value; setTempData(newData); }} placeholder="Full-time/Part-time" />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={exp.description || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].description = e.target.value; setTempData(newData); }} placeholder="Describe your role..." rows={2} />
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setTempData(tempData.filter((_: any, i: number) => i !== idx))}><Trash2 className="w-4 h-4 mr-2" />Remove</Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTempData([...tempData, {}])}><Plus className="w-4 h-4 mr-2" />Add Experience</Button>
                <Button onClick={() => saveSection('experience', tempData)} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}</Button>
                <Button variant="outline" onClick={cancelEdit}><X className="w-4 h-4 mr-2" />Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {profile.experience.length > 0 ? profile.experience.map((exp, i) => (
                <div key={i} className="flex gap-4 pb-6 border-b last:border-0 last:pb-0">
                  <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center flex-shrink-0"><Briefcase className="w-6 h-6 text-primary" /></div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{exp.title}</h4>
                    <p className="text-muted-foreground">{exp.company}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      {exp.type && <Badge variant="outline">{exp.type}</Badge>}
                      {exp.period && <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{exp.period}</span>}
                      {exp.location && <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" />{exp.location}</span>}
                    </div>
                    {exp.description && <p className="text-sm mt-2 text-muted-foreground">{exp.description}</p>}
                  </div>
                </div>
              )) : <p className="text-muted-foreground text-sm">No experience added yet</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Education Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center">
            <GraduationCap className="w-5 h-5 mr-2" />
            Education
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => startEdit('education', profile.education)}>
            <Edit className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {editingSection === 'education' ? (
            <div className="space-y-6">
              {tempData.map((edu: EducationItem, idx: number) => (
                <div key={idx} className="p-4 border rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Degree</Label>
                      <Input value={edu.degree || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].degree = e.target.value; setTempData(newData); }} placeholder="e.g., Ph.D. in Computer Science" />
                    </div>
                    <div>
                      <Label>Institution</Label>
                      <Input value={edu.institution || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].institution = e.target.value; setTempData(newData); }} placeholder="e.g., Stanford University" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Period</Label>
                      <Input value={edu.period || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].period = e.target.value; setTempData(newData); }} placeholder="e.g., 2018 - 2022" />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input value={edu.location || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].location = e.target.value; setTempData(newData); }} placeholder="e.g., California, USA" />
                    </div>
                    <div>
                      <Label>GPA</Label>
                      <Input value={edu.gpa || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].gpa = e.target.value; setTempData(newData); }} placeholder="e.g., 3.9/4.0" />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={edu.description || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].description = e.target.value; setTempData(newData); }} placeholder="Describe your studies..." rows={2} />
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setTempData(tempData.filter((_: any, i: number) => i !== idx))}><Trash2 className="w-4 h-4 mr-2" />Remove</Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTempData([...tempData, {}])}><Plus className="w-4 h-4 mr-2" />Add Education</Button>
                <Button onClick={() => saveSection('education', tempData)} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}</Button>
                <Button variant="outline" onClick={cancelEdit}><X className="w-4 h-4 mr-2" />Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {profile.education.length > 0 ? profile.education.map((edu, i) => (
                <div key={i} className="flex gap-4 pb-6 border-b last:border-0 last:pb-0">
                  <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center flex-shrink-0"><GraduationCap className="w-6 h-6 text-primary" /></div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{edu.degree}</h4>
                    <p className="text-muted-foreground">{edu.institution}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      {edu.period && <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{edu.period}</span>}
                      {edu.location && <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" />{edu.location}</span>}
                      {edu.gpa && <span>GPA: {edu.gpa}</span>}
                    </div>
                    {edu.description && <p className="text-sm mt-2 text-muted-foreground">{edu.description}</p>}
                  </div>
                </div>
              )) : <p className="text-muted-foreground text-sm">No education added yet</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publications Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Publications
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => startEdit('publications', profile.publications)}>
            <Edit className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {editingSection === 'publications' ? (
            <div className="space-y-6">
              {tempData.map((pub: Publication, idx: number) => (
                <div key={idx} className="p-4 border rounded-lg space-y-3">
                  <div>
                    <Label>Title</Label>
                    <Input value={pub.title || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].title = e.target.value; setTempData(newData); }} placeholder="Publication title" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Journal/Conference</Label>
                      <Input value={pub.journal || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].journal = e.target.value; setTempData(newData); }} placeholder="e.g., Nature, IEEE" />
                    </div>
                    <div>
                      <Label>Year</Label>
                      <Input value={pub.year || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].year = e.target.value; setTempData(newData); }} placeholder="e.g., 2024" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Citations</Label>
                      <Input type="number" value={pub.citations || 0} onChange={(e) => { const newData = [...tempData]; newData[idx].citations = parseInt(e.target.value) || 0; setTempData(newData); }} placeholder="Number of citations" />
                    </div>
                    <div>
                      <Label>Link</Label>
                      <Input value={pub.link || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].link = e.target.value; setTempData(newData); }} placeholder="https://..." />
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setTempData(tempData.filter((_: any, i: number) => i !== idx))}><Trash2 className="w-4 h-4 mr-2" />Remove</Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTempData([...tempData, {}])}><Plus className="w-4 h-4 mr-2" />Add Publication</Button>
                <Button onClick={() => saveSection('publications', tempData)} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}</Button>
                <Button variant="outline" onClick={cancelEdit}><X className="w-4 h-4 mr-2" />Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {profile.publications.length > 0 ? profile.publications.map((pub, i) => (
                <div key={i} className="pb-4 border-b last:border-0 last:pb-0">
                  <h4 className="font-semibold">{pub.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{pub.journal} • {pub.year}</p>
                  {pub.citations !== undefined && pub.citations > 0 && <p className="text-sm text-muted-foreground flex items-center mt-1"><Eye className="w-3 h-3 mr-1" />{pub.citations} citations</p>}
                  {pub.link && <a href={pub.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center mt-1 hover:underline"><LinkIcon className="w-3 h-3 mr-1" />View Publication</a>}
                </div>
              )) : <p className="text-muted-foreground text-sm">No publications added yet</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Projects
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => startEdit('projects', profile.projects)}>
            <Edit className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {editingSection === 'projects' ? (
            <div className="space-y-6">
              {tempData.map((proj: ProjectItem, idx: number) => (
                <div key={idx} className="p-4 border rounded-lg space-y-3">
                  <div>
                    <Label>Project Title</Label>
                    <Input value={proj.title || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].title = e.target.value; setTempData(newData); }} placeholder="Project name" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={proj.description || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].description = e.target.value; setTempData(newData); }} placeholder="Describe your project..." rows={2} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Status</Label>
                      <Input value={proj.status || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].status = e.target.value; setTempData(newData); }} placeholder="Active/Completed" />
                    </div>
                    <div>
                      <Label>Completion %</Label>
                      <Input type="number" value={proj.completion || 0} onChange={(e) => { const newData = [...tempData]; newData[idx].completion = parseInt(e.target.value) || 0; setTempData(newData); }} placeholder="0-100" min="0" max="100" />
                    </div>
                    <div>
                      <Label>Collaborators</Label>
                      <Input type="number" value={proj.collaborators || 0} onChange={(e) => { const newData = [...tempData]; newData[idx].collaborators = parseInt(e.target.value) || 0; setTempData(newData); }} placeholder="Number" />
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setTempData(tempData.filter((_: any, i: number) => i !== idx))}><Trash2 className="w-4 h-4 mr-2" />Remove</Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTempData([...tempData, {}])}><Plus className="w-4 h-4 mr-2" />Add Project</Button>
                <Button onClick={() => saveSection('projects', tempData)} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}</Button>
                <Button variant="outline" onClick={cancelEdit}><X className="w-4 h-4 mr-2" />Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {profile.projects.length > 0 ? profile.projects.map((proj, i) => (
                <div key={i} className="pb-6 border-b last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-lg">{proj.title}</h4>
                    {proj.status && <Badge>{proj.status}</Badge>}
                  </div>
                  {proj.description && <p className="text-sm text-muted-foreground mb-3">{proj.description}</p>}
                  {proj.completion !== undefined && (
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{proj.completion}%</span>
                      </div>
                      <Progress value={proj.completion} className="h-2" />
                    </div>
                  )}
                  {proj.collaborators !== undefined && proj.collaborators > 0 && <span className="text-sm text-muted-foreground flex items-center"><Users className="w-4 h-4 mr-1" />{proj.collaborators} collaborators</span>}
                </div>
              )) : <p className="text-muted-foreground text-sm">No projects added yet</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certifications Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center">
            <Award className="w-5 h-5 mr-2" />
            Certifications
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => startEdit('certifications', profile.certifications)}>
            <Edit className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {editingSection === 'certifications' ? (
            <div className="space-y-6">
              {tempData.map((cert: CertificationItem, idx: number) => (
                <div key={idx} className="p-4 border rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Certification Name</Label>
                      <Input value={cert.title || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].title = e.target.value; setTempData(newData); }} placeholder="e.g., AWS Certified" />
                    </div>
                    <div>
                      <Label>Issuing Organization</Label>
                      <Input value={cert.issuer || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].issuer = e.target.value; setTempData(newData); }} placeholder="e.g., Amazon" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Issue Date</Label>
                      <Input value={cert.issued || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].issued = e.target.value; setTempData(newData); }} placeholder="Jan 2023" />
                    </div>
                    <div>
                      <Label>Expiry Date</Label>
                      <Input value={cert.expires || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].expires = e.target.value; setTempData(newData); }} placeholder="Jan 2026" />
                    </div>
                    <div>
                      <Label>Credential ID</Label>
                      <Input value={cert.credentialId || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].credentialId = e.target.value; setTempData(newData); }} placeholder="ID" />
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setTempData(tempData.filter((_: any, i: number) => i !== idx))}><Trash2 className="w-4 h-4 mr-2" />Remove</Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTempData([...tempData, {}])}><Plus className="w-4 h-4 mr-2" />Add Certification</Button>
                <Button onClick={() => saveSection('certifications', tempData)} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}</Button>
                <Button variant="outline" onClick={cancelEdit}><X className="w-4 h-4 mr-2" />Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {profile.certifications.length > 0 ? profile.certifications.map((cert, i) => (
                <div key={i} className="pb-4 border-b last:border-0 last:pb-0">
                  <h4 className="font-semibold">{cert.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{cert.issuer}{cert.issued && ` • Issued: ${cert.issued}`}{cert.expires && ` • Expires: ${cert.expires}`}</p>
                  {cert.credentialId && <p className="text-sm text-muted-foreground mt-1">Credential ID: {cert.credentialId}</p>}
                </div>
              )) : <p className="text-muted-foreground text-sm">No certifications added yet</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Languages Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Languages
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => startEdit('languages', profile.languages)}>
            <Edit className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {editingSection === 'languages' ? (
            <div className="space-y-4">
              {tempData.map((lang: LanguageItem, idx: number) => (
                <div key={idx} className="flex gap-3 p-3 border rounded">
                  <Input value={lang.language || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].language = e.target.value; setTempData(newData); }} placeholder="Language" />
                  <Input value={lang.proficiency || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].proficiency = e.target.value; setTempData(newData); }} placeholder="Native/Fluent" />
                  <Button variant="destructive" size="icon" onClick={() => setTempData(tempData.filter((_: any, i: number) => i !== idx))}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTempData([...tempData, {}])}><Plus className="w-4 h-4 mr-2" />Add Language</Button>
                <Button onClick={() => saveSection('languages', tempData)} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}</Button>
                <Button variant="outline" onClick={cancelEdit}><X className="w-4 h-4 mr-2" />Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {profile.languages.length > 0 ? profile.languages.map((lang, i) => (
                <div key={i} className="flex justify-between items-center p-3 border rounded">
                  <span className="font-medium">{lang.language}</span>
                  <Badge variant="outline">{lang.proficiency}</Badge>
                </div>
              )) : <p className="text-muted-foreground text-sm col-span-3">No languages added yet</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Volunteer Work Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center">
            <Heart className="w-5 h-5 mr-2" />
            Volunteer Experience
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => startEdit('volunteer', profile.volunteer)}>
            <Edit className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {editingSection === 'volunteer' ? (
            <div className="space-y-6">
              {tempData.map((vol: VolunteerItem, idx: number) => (
                <div key={idx} className="p-4 border rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Role</Label>
                      <Input value={vol.role || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].role = e.target.value; setTempData(newData); }} placeholder="e.g., Mentor" />
                    </div>
                    <div>
                      <Label>Organization</Label>
                      <Input value={vol.organization || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].organization = e.target.value; setTempData(newData); }} placeholder="Organization name" />
                    </div>
                  </div>
                  <div>
                    <Label>Period</Label>
                    <Input value={vol.period || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].period = e.target.value; setTempData(newData); }} placeholder="e.g., 2020 - Present" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={vol.description || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].description = e.target.value; setTempData(newData); }} placeholder="Describe your work..." rows={2} />
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setTempData(tempData.filter((_: any, i: number) => i !== idx))}><Trash2 className="w-4 h-4 mr-2" />Remove</Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTempData([...tempData, {}])}><Plus className="w-4 h-4 mr-2" />Add Volunteer Work</Button>
                <Button onClick={() => saveSection('volunteer', tempData)} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}</Button>
                <Button variant="outline" onClick={cancelEdit}><X className="w-4 h-4 mr-2" />Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {profile.volunteer.length > 0 ? profile.volunteer.map((vol, i) => (
                <div key={i} className="pb-4 border-b last:border-0 last:pb-0">
                  <h4 className="font-semibold">{vol.role}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{vol.organization}{vol.period && ` • ${vol.period}`}</p>
                  {vol.description && <p className="text-sm text-muted-foreground mt-2">{vol.description}</p>}
                </div>
              )) : <p className="text-muted-foreground text-sm">No volunteer work added yet</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievements Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center">
            <Trophy className="w-5 h-5 mr-2" />
            Achievements & Awards
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => startEdit('achievements', profile.achievements)}>
            <Edit className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {editingSection === 'achievements' ? (
            <div className="space-y-6">
              {tempData.map((ach: AchievementItem, idx: number) => (
                <div key={idx} className="p-4 border rounded-lg space-y-3">
                  <div>
                    <Label>Achievement Title</Label>
                    <Input value={ach.title || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].title = e.target.value; setTempData(newData); }} placeholder="e.g., Best Paper Award" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Organization</Label>
                      <Input value={ach.organization || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].organization = e.target.value; setTempData(newData); }} placeholder="e.g., IEEE" />
                    </div>
                    <div>
                      <Label>Year</Label>
                      <Input value={ach.year || ''} onChange={(e) => { const newData = [...tempData]; newData[idx].year = e.target.value; setTempData(newData); }} placeholder="e.g., 2024" />
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setTempData(tempData.filter((_: any, i: number) => i !== idx))}><Trash2 className="w-4 h-4 mr-2" />Remove</Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTempData([...tempData, {}])}><Plus className="w-4 h-4 mr-2" />Add Achievement</Button>
                <Button onClick={() => saveSection('achievements', tempData)} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}</Button>
                <Button variant="outline" onClick={cancelEdit}><X className="w-4 h-4 mr-2" />Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.achievements.length > 0 ? profile.achievements.map((ach, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0"><Trophy className="w-5 h-5 text-yellow-600" /></div>
                    <div>
                      <h4 className="font-semibold">{ach.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{ach.organization}{ach.year && ` • ${ach.year}`}</p>
                    </div>
                  </div>
                </div>
              )) : <p className="text-muted-foreground text-sm col-span-2">No achievements added yet</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Basic Info Edit Modal */}
      {editingSection === 'basic' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b">
              <CardTitle>Edit Profile Information</CardTitle>
              <Button variant="ghost" size="icon" onClick={cancelEdit}>
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={tempData?.name || ''}
                  onChange={(e) => setTempData({ ...tempData, name: e.target.value })}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <Label>Domain / Field of Study</Label>
                <Input
                  value={tempData?.domain || ''}
                  onChange={(e) => setTempData({ ...tempData, domain: e.target.value })}
                  placeholder="e.g., Computer Science"
                />
              </div>
              <div>
                <Label>Institution</Label>
                <Input
                  value={tempData?.institution || ''}
                  onChange={(e) => setTempData({ ...tempData, institution: e.target.value })}
                  placeholder="e.g., Stanford University"
                />
              </div>
              <div>
                <Label>Bio / About</Label>
                <Textarea
                  value={tempData?.bio || ''}
                  onChange={(e) => setTempData({ ...tempData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={async () => {
                  await saveSection('name', tempData.name);
                  await saveSection('domain', tempData.domain);
                  await saveSection('bio', tempData.bio);
                  await saveSection('institution', tempData.institution);
                }} disabled={saving} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Profile;