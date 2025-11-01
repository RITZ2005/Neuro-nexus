import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, UserPlus, Mail, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Collaborators = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');

  const suggestedCollaborators = [
    {
      id: 1,
      name: 'Dr. Maria Santos',
      title: 'Climate Scientist',
      institution: 'MIT',
      domain: 'Climate Science',
      interests: ['Ocean Dynamics', 'Climate Modeling', 'Data Analysis'],
      matchScore: 95,
      location: 'Boston, MA'
    },
    {
      id: 2,
      name: 'Prof. David Chen',
      title: 'AI Researcher',
      institution: 'Stanford University',
      domain: 'Artificial Intelligence',
      interests: ['Machine Learning', 'Computer Vision', 'Environmental AI'],
      matchScore: 89,
      location: 'Palo Alto, CA'
    },
    {
      id: 3,
      name: 'Dr. Sarah Johnson',
      title: 'Environmental Engineer',
      institution: 'UC Berkeley',
      domain: 'Environmental Science',
      interests: ['Sustainable Technology', 'Green Energy', 'IoT Sensors'],
      matchScore: 87,
      location: 'Berkeley, CA'
    },
    {
      id: 4,
      name: 'Dr. Ahmed Hassan',
      title: 'Data Scientist',
      institution: 'Carnegie Mellon',
      domain: 'Computer Science',
      interests: ['Big Data', 'Statistical Analysis', 'Climate Informatics'],
      matchScore: 82,
      location: 'Pittsburgh, PA'
    },
    {
      id: 5,
      name: 'Prof. Lisa Rodriguez',
      title: 'Marine Biologist',
      institution: 'Scripps Institute',
      domain: 'Biology & Life Sciences',
      interests: ['Marine Ecosystems', 'Conservation Biology', 'Ocean Health'],
      matchScore: 78,
      location: 'San Diego, CA'
    },
    {
      id: 6,
      name: 'Dr. James Wilson',
      title: 'Physics Professor',
      institution: 'Caltech',
      domain: 'Physics & Astronomy',
      interests: ['Atmospheric Physics', 'Remote Sensing', 'Satellite Data'],
      matchScore: 75,
      location: 'Pasadena, CA'
    }
  ];

  const domains = [
    'All Domains',
    'Artificial Intelligence',
    'Biology & Life Sciences',
    'Climate Science',
    'Computer Science',
    'Environmental Science',
    'Physics & Astronomy'
  ];

  const filteredCollaborators = suggestedCollaborators.filter(collaborator => {
    const matchesSearch = collaborator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         collaborator.institution.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         collaborator.interests.some(interest => 
                           interest.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    const matchesDomain = !selectedDomain || selectedDomain === 'All Domains' || 
                         collaborator.domain === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  const getMatchColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Find Collaborators</h1>
            <p className="text-muted-foreground">
              AI-powered matching to connect with researchers who share your interests.
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-soft border-card-border mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, institution, or research interests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                  <SelectTrigger className="w-64 pl-10">
                    <SelectValue placeholder="Filter by domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map((domain) => (
                      <SelectItem key={domain} value={domain}>
                        {domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collaborators Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCollaborators.map((collaborator, index) => (
            <motion.div
              key={collaborator.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="hover-lift shadow-soft border-card-border h-full">
                <CardHeader>
                  <div className="flex items-start space-x-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={`/placeholder-${collaborator.id}.jpg`} alt={collaborator.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {collaborator.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{collaborator.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{collaborator.title}</p>
                          <p className="text-sm text-muted-foreground">{collaborator.institution}</p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`${getMatchColor(collaborator.matchScore)} border-current`}
                        >
                          {collaborator.matchScore}% match
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <Badge className="mb-2">{collaborator.domain}</Badge>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 mr-1" />
                      {collaborator.location}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Research Interests:</p>
                    <div className="flex flex-wrap gap-1">
                      {collaborator.interests.map((interest) => (
                        <Badge key={interest} variant="secondary" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1 btn-collaboration">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Connect
                    </Button>
                    <Button variant="outline" size="sm">
                      <Mail className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredCollaborators.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground text-lg">
              No collaborators found matching your criteria.
            </p>
            <p className="text-muted-foreground">
              Try adjusting your search terms or filters.
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Collaborators;