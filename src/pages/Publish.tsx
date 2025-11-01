import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Loader2, CheckCircle, Hash, Copy, AlertCircle, Download, Key, Lock, Unlock, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiUploadWithFormData, apiGet, apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface PublicationResult {
  success: boolean;
  publication_id: string;
  private_key: string;
  ipfs_hash: string;
  title: string;
  message: string;
}

interface Publication {
  id: string;
  title: string;
  description: string;
  domain: string;
  keywords: string[];
  ipfs_hash: string;
  owner_id: string;
  owner_name: string;
  created_at: string;
  file_size: number;
  file_type: string;
  file_name: string;
  access_count: number;
  status: string;
}

const Publish = () => {
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
  const [publicationResult, setPublicationResult] = useState<PublicationResult | null>(null);
  const [myPublications, setMyPublications] = useState<Publication[]>([]);
  const [loadingPublications, setLoadingPublications] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    domain: '',
    keywords: '',
    file: null as File | null
  });

  // Access Document State
  const [accessTab, setAccessTab] = useState<'own' | 'key'>('own');
  const [accessFormData, setAccessFormData] = useState({
    publicationId: '',
    privateKey: ''
  });
  const [accessingDocument, setAccessingDocument] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Publication[]>([]);
  const [searchingPublications, setSearchingPublications] = useState(false);

  const researchDomains = [
    'Artificial Intelligence',
    'Biology & Life Sciences',
    'Climate Science',
    'Computer Science',
    'Medicine & Healthcare',
    'Physics & Astronomy',
    'Chemistry',
    'Mathematics',
    'Environmental Science'
  ];

  // Load user's publications on mount
  useEffect(() => {
    loadMyPublications();
  }, []);

  const loadMyPublications = async () => {
    setLoadingPublications(true);
    try {
      const response = await apiGet('/publications/my-publications');
      if (response.ok) {
        const data = await response.json();
        setMyPublications(data);
      }
    } catch (error) {
      console.error('Error loading publications:', error);
    } finally {
      setLoadingPublications(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      file
    }));
  };

  const handleDomainChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      domain: value
    }));
  };

  const handlePublish = async () => {
    if (!formData.file || !formData.title || !formData.description || !formData.domain) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields and upload a file",
        variant: "destructive"
      });
      return;
    }

    setIsPublishing(true);
    setPublishProgress(0);

    try {
      // Progress simulation while uploading
      const progressInterval = setInterval(() => {
        setPublishProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      // Make API call
      const response = await apiUploadWithFormData('/publications/publish', formData.file, {
        title: formData.title,
        description: formData.description,
        domain: formData.domain,
        keywords: formData.keywords
      });

      clearInterval(progressInterval);
      setPublishProgress(100);

      if (response.ok) {
        const result = await response.json();
        setPublicationResult(result);
        setShowPrivateKeyModal(true);
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          domain: '',
          keywords: '',
          file: null
        });
        
        // Reload publications list
        await loadMyPublications();
        
        toast({
          title: "Publication Successful!",
          description: "Your document has been encrypted and published to IPFS"
        });
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to publish document');
      }
    } catch (error) {
      console.error('Error publishing:', error);
      toast({
        title: "Publication Failed",
        description: error instanceof Error ? error.message : "An error occurred while publishing",
        variant: "destructive"
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Private key copied to clipboard"
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleAccessDocument = async () => {
    if (!accessFormData.publicationId || !accessFormData.privateKey) {
      toast({
        title: "Missing Information",
        description: "Please provide both Publication ID and Private Key",
        variant: "destructive"
      });
      return;
    }

    setAccessingDocument(true);

    try {
      // Trim whitespace from inputs to avoid hash mismatch
      const cleanPublicationId = accessFormData.publicationId.trim();
      const cleanPrivateKey = accessFormData.privateKey.trim();

      const response = await apiPost('/publications/access', {
        publication_id: cleanPublicationId,
        private_key: cleanPrivateKey
      });

      if (response.ok) {
        // Get the blob data
        const blob = await response.blob();
        
        // Get filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'document';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Success!",
          description: "Document decrypted and downloaded successfully"
        });

        // Clear form
        setAccessFormData({
          publicationId: '',
          privateKey: ''
        });
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to access document');
      }
    } catch (error) {
      console.error('Error accessing document:', error);
      toast({
        title: "Access Failed",
        description: error instanceof Error ? error.message : "Invalid private key or publication ID",
        variant: "destructive"
      });
    } finally {
      setAccessingDocument(false);
    }
  };

  const handleSearchPublications = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchingPublications(true);
    try {
      const response = await apiPost('/publications/search', {
        query: searchQuery
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching publications:', error);
      toast({
        title: "Search Failed",
        description: "Failed to search publications",
        variant: "destructive"
      });
    } finally {
      setSearchingPublications(false);
    }
  };

  const handleAccessFromSearch = (publicationId: string) => {
    setAccessFormData(prev => ({
      ...prev,
      publicationId
    }));
    setAccessTab('key');
  };

  return (
    <>
      {/* Private Key Modal */}
      <Dialog open={showPrivateKeyModal} onOpenChange={setShowPrivateKeyModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Publication Successful!
            </DialogTitle>
            <DialogDescription>
              Your document has been encrypted and published to IPFS
            </DialogDescription>
          </DialogHeader>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>⚠️ CRITICAL: Save Your Private Key!</AlertTitle>
            <AlertDescription>
              This key is shown ONLY ONCE and cannot be recovered. You need it to access your document.
              Store it in a secure location immediately!
            </AlertDescription>
          </Alert>

          {publicationResult && (
            <div className="space-y-4">
              <div className="p-4 bg-accent/30 rounded-lg">
                <Label className="text-sm font-medium mb-2 block">Private Key</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-background rounded border text-sm break-all">
                    {publicationResult.private_key}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(publicationResult.private_key)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-accent/10 rounded-lg space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Title</Label>
                  <p className="font-medium">{publicationResult.title}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">IPFS Hash</Label>
                  <p className="text-sm font-mono">{publicationResult.ipfs_hash}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Publication ID</Label>
                  <p className="text-sm font-mono">{publicationResult.publication_id}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-end">
            <Button
              variant="outline"
              onClick={() => publicationResult && copyToClipboard(publicationResult.private_key)}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Key Again
            </Button>
            <Button onClick={() => setShowPrivateKeyModal(false)}>
              I've Saved My Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Research Publications</h1>
            <p className="text-muted-foreground">
              Securely publish and access encrypted research documents on IPFS blockchain.
            </p>
          </div>
        </div>

        <Tabs defaultValue="publish" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="publish" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Publish Document
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center gap-2">
              <Unlock className="w-4 h-4" />
              Access Document
            </TabsTrigger>
          </TabsList>

          {/* Publish Tab */}
          <TabsContent value="publish" className="mt-6">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Publishing Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-medium border-card-border">
              <CardHeader>
                <CardTitle>Upload Research Document</CardTitle>
                <CardDescription>
                  Provide details about your research paper or dataset for blockchain publication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isPublishing ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                    <h3 className="text-lg font-medium mb-2">Publishing to Blockchain</h3>
                    <p className="text-muted-foreground mb-4">Please wait while we process your publication...</p>
                    <Progress value={publishProgress} className="max-w-xs mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">{publishProgress}% complete</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="title">Research Title</Label>
                      <Input
                        id="title"
                        name="title"
                        placeholder="Enter your research title..."
                        value={formData.title}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Abstract/Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="Provide a brief abstract or description of your research..."
                        rows={4}
                        value={formData.description}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="domain">Research Domain</Label>
                        <Select onValueChange={handleDomainChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select domain" />
                          </SelectTrigger>
                          <SelectContent>
                            {researchDomains.map((domain) => (
                              <SelectItem key={domain} value={domain}>
                                {domain}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="keywords">Keywords</Label>
                        <Input
                          id="keywords"
                          name="keywords"
                          placeholder="machine learning, climate, AI..."
                          value={formData.keywords}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="file">Research Document</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                        <input
                          id="file"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label htmlFor="file" className="cursor-pointer">
                          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground mb-2">
                            {formData.file ? formData.file.name : 'Click to upload or drag and drop'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            PDF, DOC, or DOCX (max 10MB)
                          </p>
                        </label>
                      </div>
                    </div>

                    <Button 
                      onClick={handlePublish}
                      className="w-full hero-gradient text-white shadow-glow"
                      disabled={!formData.title || !formData.description || !formData.file}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Publish to Blockchain
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* My Publications */}
          <div>
            <Card className="shadow-soft border-card-border">
              <CardHeader>
                <CardTitle>My Publications</CardTitle>
                <CardDescription>Your published research documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingPublications ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                  </div>
                ) : myPublications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No publications yet. Upload your first document!
                  </p>
                ) : (
                  myPublications.slice(0, 5).map((pub, index) => (
                    <motion.div
                      key={pub.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="p-4 rounded-lg bg-accent/30 hover-lift"
                    >
                      <h4 className="font-medium text-sm mb-2 line-clamp-2">{pub.title}</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">{pub.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {pub.access_count} {pub.access_count === 1 ? 'access' : 'accesses'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p>IPFS: {pub.ipfs_hash?.substring(0, 20)}...</p>
                          <p>Published: {formatDate(pub.created_at)}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Publishing Benefits */}
            <Card className="shadow-soft border-card-border mt-6">
              <CardHeader>
                <CardTitle>Blockchain Benefits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Immutable Records</p>
                    <p className="text-xs text-muted-foreground">Permanent, tamper-proof publication</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Transparent Process</p>
                    <p className="text-xs text-muted-foreground">Verifiable publication history</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Global Access</p>
                    <p className="text-xs text-muted-foreground">Accessible worldwide instantly</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
          </TabsContent>

          {/* Access Document Tab */}
          <TabsContent value="access" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Access Form */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-medium border-card-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="w-5 h-5" />
                      Access Encrypted Document
                    </CardTitle>
                    <CardDescription>
                      Retrieve and decrypt documents using the private key provided by the document owner
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert>
                      <Lock className="h-4 w-4" />
                      <AlertTitle>Secure Access</AlertTitle>
                      <AlertDescription>
                        Documents are encrypted and stored on IPFS. You need the private key from the document owner to decrypt and access them.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="publicationId">Publication ID</Label>
                      <Input
                        id="publicationId"
                        placeholder="Enter publication ID..."
                        value={accessFormData.publicationId}
                        onChange={(e) => setAccessFormData(prev => ({ ...prev, publicationId: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        The unique identifier for the published document
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="privateKey">Private Decryption Key</Label>
                      <Textarea
                        id="privateKey"
                        placeholder="Paste the private key here..."
                        rows={3}
                        value={accessFormData.privateKey}
                        onChange={(e) => setAccessFormData(prev => ({ ...prev, privateKey: e.target.value }))}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        The private key provided by the document owner (keep this secure!)
                      </p>
                    </div>

                    <Button
                      onClick={handleAccessDocument}
                      disabled={accessingDocument || !accessFormData.publicationId || !accessFormData.privateKey}
                      className="w-full"
                    >
                      {accessingDocument ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Decrypting & Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Decrypt & Download Document
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Search Publications */}
                <Card className="shadow-medium border-card-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="w-5 h-5" />
                      Search Publications
                    </CardTitle>
                    <CardDescription>
                      Search for published documents to find their Publication ID
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search by title, keywords, or domain..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchPublications()}
                      />
                      <Button
                        onClick={handleSearchPublications}
                        disabled={searchingPublications}
                      >
                        {searchingPublications ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {searchResults.map((pub) => (
                          <div
                            key={pub.id}
                            className="p-4 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm mb-1">{pub.title}</h4>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {pub.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {pub.domain}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatFileSize(pub.file_size)}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAccessFromSearch(pub.id)}
                              >
                                <Key className="w-3 h-3 mr-1" />
                                Use ID
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              ID: {pub.id}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchQuery && !searchingPublications && searchResults.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No publications found matching "{searchQuery}"
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Info Sidebar */}
              <div className="space-y-6">
                <Card className="shadow-soft border-card-border">
                  <CardHeader>
                    <CardTitle>How It Works</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                        1
                      </div>
                      <div>
                        <p className="font-medium text-sm">Get Publication ID</p>
                        <p className="text-xs text-muted-foreground">
                          Search for the document or get the ID from the owner
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                        2
                      </div>
                      <div>
                        <p className="font-medium text-sm">Enter Private Key</p>
                        <p className="text-xs text-muted-foreground">
                          Paste the decryption key shared by the document owner
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                        3
                      </div>
                      <div>
                        <p className="font-medium text-sm">Decrypt & Download</p>
                        <p className="text-xs text-muted-foreground">
                          Document is decrypted and downloaded to your device
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-soft border-card-border">
                  <CardHeader>
                    <CardTitle>Security Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Private keys are never stored on our servers
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Decryption happens locally in your browser
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Keep your private keys secure and backed up
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Lost keys cannot be recovered
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
    </>
  );
};

export default Publish;