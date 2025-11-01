import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, FileText, Clock, User, Save, 
  History, Trash2, MoreVertical, Download, Code2 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor';
import { LaTeXEditor } from '@/components/editor/LaTeXEditor';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface DocumentListItem {
  id: string;
  title: string;
  project_id: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  version: number;
  last_edited_by_name: string;
}

interface DocumentData {
  id: string;
  title: string;
  content: string;
  project_id: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  version: number;
  last_edited_by: string;
  last_edited_by_name: string;
  document_type?: 'tiptap' | 'latex'; // Add document type
}

interface TemplateListItem {
  id: string;
  title: string;
  description: string;
  category: string;
  is_predefined: boolean;
  created_by_name?: string;
}

interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  title: string;
  content: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  change_description?: string;
}

const ProjectWorkspace = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');

  // Template state
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<'tiptap' | 'latex'>('tiptap');

  // Version history state
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);

  // Editor state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (selectedDoc) {
      setEditTitle(selectedDoc.title);
      setEditContent(selectedDoc.content);
      setHasUnsavedChanges(false);
    }
  }, [selectedDoc]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await apiGet(`/documents/project/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Documents loaded:', data);
        setDocuments(data.documents || []);
        
        // Auto-select first document
        if (data.documents && data.documents.length > 0 && !selectedDoc) {
          loadDocument(data.documents[0].id);
        }
      } else {
        throw new Error('Failed to load documents');
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDocument = async (docId: string) => {
    try {
      const response = await apiGet(`/documents/${docId}`);
      if (response.ok) {
        const doc = await response.json();
        setSelectedDoc(doc);
      } else {
        throw new Error('Failed to load document');
      }
    } catch (error) {
      console.error('Error loading document:', error);
      toast({
        title: "Error",
        description: "Failed to load document",
        variant: "destructive"
      });
    }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await apiGet('/documents/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive"
      });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleShowTemplateDialog = () => {
    setShowTemplateDialog(true);
    loadTemplates();
  };

  const handleCreateFromTemplate = async () => {
    // Handle LaTeX templates
    if (selectedDocType === 'latex') {
      try {
        // Map LaTeX template selection to content
        const latexTemplates: Record<string, string> = {
          'latex-article': '\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amsmath}\n\\usepackage{graphicx}\n\n\\title{Your Research Title}\n\\author{Your Name}\n\\date{\\today}\n\n\\begin{document}\n\n\\maketitle\n\n\\begin{abstract}\nWrite your abstract here.\n\\end{abstract}\n\n\\section{Introduction}\nYour introduction text here.\n\n\\section{Methodology}\nDescribe your methodology.\n\n\\section{Results}\nPresent your results.\n\n\\section{Conclusion}\nConclude your work.\n\n\\end{document}',
          'latex-report': '\\documentclass{report}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amsmath}\n\\usepackage{graphicx}\n\\usepackage{hyperref}\n\n\\title{Lab Report Title}\n\\author{Your Name}\n\\date{\\today}\n\n\\begin{document}\n\n\\maketitle\n\\tableofcontents\n\n\\chapter{Introduction}\nIntroduction to the experiment.\n\n\\chapter{Materials and Methods}\n\\section{Materials}\nList of materials used.\n\n\\section{Methods}\nDescribe the experimental procedure.\n\n\\chapter{Results}\nPresent your experimental results.\n\n\\chapter{Discussion}\nDiscuss the implications of your results.\n\n\\chapter{Conclusion}\nSummarize your findings.\n\n\\end{document}',
          'latex-paper': '\\documentclass[12pt,a4paper]{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage[margin=1in]{geometry}\n\\usepackage{amsmath,amssymb}\n\\usepackage{graphicx}\n\\usepackage{cite}\n\\usepackage{hyperref}\n\n\\title{Research Paper Title:\\\\A Comprehensive Study}\n\\author{Author Name\\textsuperscript{1}, Co-Author Name\\textsuperscript{2}\\\\\n\\small \\textsuperscript{1}Department, University\\\\\n\\small \\textsuperscript{2}Department, University}\n\\date{\\today}\n\n\\begin{document}\n\n\\maketitle\n\n\\begin{abstract}\n\\noindent\nResearch abstract goes here. Summarize the key findings, methodology, and conclusions in 150-250 words.\n\\end{abstract}\n\n\\section{Introduction}\n\\label{sec:intro}\nBackground and motivation for the research.\n\n\\subsection{Research Question}\nState your research question clearly.\n\n\\section{Literature Review}\nReview relevant previous work.\n\n\\section{Methodology}\n\\subsection{Data Collection}\nDescribe data collection methods.\n\n\\subsection{Analysis}\nExplain analytical approaches.\n\n\\section{Results}\n\\subsection{Key Findings}\nPresent main results.\n\n\\begin{equation}\nE = mc^2\n\\label{eq:einstein}\n\\end{equation}\n\n\\section{Discussion}\nInterpret and discuss results.\n\n\\section{Conclusion}\nSummarize findings and future work.\n\n\\begin{thebibliography}{9}\n\\bibitem{ref1} Author. \\textit{Title}. Publisher, Year.\n\\end{thebibliography}\n\n\\end{document}',
          'latex-blank': '\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amsmath}\n\n\\title{Document Title}\n\\author{Your Name}\n\\date{\\today}\n\n\\begin{document}\n\n\\maketitle\n\nWrite your content here.\n\n\\end{document}'
        };

        const latexContent = selectedTemplate ? latexTemplates[selectedTemplate] : latexTemplates['latex-blank'];
        const defaultTitles: Record<string, string> = {
          'latex-article': 'New Article',
          'latex-report': 'New Lab Report',
          'latex-paper': 'New Research Paper',
          'latex-blank': 'New LaTeX Document'
        };

        const response = await apiPost('/documents', {
          title: newDocTitle.trim() || (selectedTemplate ? defaultTitles[selectedTemplate] : 'New LaTeX Document'),
          content: latexContent || '',
          project_id: projectId,
          document_type: 'latex'
        });

        if (response.ok) {
          const doc = await response.json();
          toast({
            title: "LaTeX Document Created!",
            description: "LaTeX document created successfully"
          });
          setShowTemplateDialog(false);
          setSelectedTemplate(null);
          setSelectedDocType('tiptap');
          setNewDocTitle('');
          loadDocuments();
          loadDocument(doc.id);
        } else {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to create LaTeX document');
        }
      } catch (error) {
        console.error('Error creating LaTeX document:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to create LaTeX document",
          variant: "destructive"
        });
      }
      return;
    }

    // Handle Tiptap templates
    if (!selectedTemplate) {
      // Create blank document
      setShowTemplateDialog(false);
      setShowCreateDialog(true);
      return;
    }

    try {
      const response = await apiPost('/documents/from-template', {
        template_id: selectedTemplate,
        project_id: projectId,
        title: newDocTitle.trim() || undefined
      });

      if (response.ok) {
        const doc = await response.json();
        toast({
          title: "Document Created!",
          description: "Document created from template"
        });
        setShowTemplateDialog(false);
        setSelectedTemplate(null);
        setSelectedDocType('tiptap');
        setNewDocTitle('');
        loadDocuments();
        loadDocument(doc.id);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create document from template');
      }
    } catch (error) {
      console.error('Error creating document from template:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create document",
        variant: "destructive"
      });
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!selectedDoc) return;

    const templateTitle = prompt('Enter template name:', selectedDoc.title);
    if (!templateTitle) return;

    const description = prompt('Enter template description (optional):') || '';
    const category = prompt('Enter category (research/lab/meeting/general):', 'general') || 'general';

    try {
      const response = await apiPost('/documents/templates', {
        title: templateTitle,
        description: description,
        content: editContent,
        category: category
      });

      if (response.ok) {
        toast({
          title: "Template Saved!",
          description: `${templateTitle} has been saved as a template`
        });
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save template",
        variant: "destructive"
      });
    }
  };

  const loadVersionHistory = async () => {
    if (!selectedDoc) return;

    setLoadingVersions(true);
    try {
      const response = await apiGet(`/documents/${selectedDoc.id}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      } else {
        throw new Error('Failed to load version history');
      }
    } catch (error) {
      console.error('Error loading versions:', error);
      toast({
        title: "Error",
        description: "Failed to load version history",
        variant: "destructive"
      });
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleShowVersionHistory = () => {
    setShowVersionHistory(true);
    loadVersionHistory();
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!selectedDoc) return;
    if (!confirm('Are you sure you want to restore this version? This will create a new version with the restored content.')) return;

    try {
      const response = await apiPost('/documents/versions/restore', {
        document_id: selectedDoc.id,
        version_id: versionId
      });

      if (response.ok) {
        const updatedDoc = await response.json();
        setSelectedDoc(updatedDoc);
        setEditTitle(updatedDoc.title);
        setEditContent(updatedDoc.content);
        setHasUnsavedChanges(false);
        setShowVersionHistory(false);
        
        toast({
          title: "Version Restored!",
          description: "Document restored to selected version"
        });
        
        loadDocuments();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to restore version');
      }
    } catch (error) {
      console.error('Error restoring version:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to restore version",
        variant: "destructive"
      });
    }
  };

  const handleCreateManualSnapshot = async () => {
    if (!selectedDoc) return;

    const description = prompt('Enter a description for this snapshot:');
    if (!description) return;

    try {
      const response = await apiPost('/documents/versions/create', {
        document_id: selectedDoc.id,
        change_description: description
      });

      if (response.ok) {
        toast({
          title: "Snapshot Created!",
          description: "Manual version snapshot saved"
        });
        loadVersionHistory();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create snapshot');
      }
    } catch (error) {
      console.error('Error creating snapshot:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create snapshot",
        variant: "destructive"
      });
    }
  };

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) return;

    try {
      const response = await apiPost('/documents/create', {
        title: newDocTitle,
        content: '',
        project_id: projectId
      });

      if (response.ok) {
        const doc = await response.json();
        toast({
          title: "Document Created!",
          description: `${newDocTitle} has been created`
        });
        setShowCreateDialog(false);
        setNewDocTitle('');
        loadDocuments();
        loadDocument(doc.id);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create document');
      }
    } catch (error) {
      console.error('Error creating document:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create document",
        variant: "destructive"
      });
    }
  };

  const handleSaveDocument = async () => {
    if (!selectedDoc) return;

    setSaving(true);
    try {
      const response = await apiPut(`/documents/${selectedDoc.id}`, {
        title: editTitle,
        content: editContent
      });

      if (response.ok) {
        const updatedDoc = await response.json();
        setSelectedDoc(updatedDoc);
        setHasUnsavedChanges(false);
        toast({
          title: "Saved!",
          description: "Document saved successfully"
        });
        loadDocuments(); // Refresh list
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save document');
      }
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save document",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await apiDelete(`/documents/${docId}`);

      if (response.ok) {
        toast({
          title: "Document Deleted",
          description: "Document has been removed"
        });
        
        if (selectedDoc?.id === docId) {
          setSelectedDoc(null);
        }
        loadDocuments();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive"
      });
    }
  };

  const handleContentChange = (value: string) => {
    setEditContent(value);
    setHasUnsavedChanges(true);
  };

  const handleTitleChange = (value: string) => {
    setEditTitle(value);
    setHasUnsavedChanges(true);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Documents Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold">Documents</h2>
            <Button size="icon" onClick={handleShowTemplateDialog}>
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No documents yet</p>
              <Button 
                size="sm" 
                className="mt-4"
                onClick={handleShowTemplateDialog}
              >
                Create First Document
              </Button>
            </div>
          ) : (
            documents.map((doc) => (
              <Card
                key={doc.id}
                className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                  selectedDoc?.id === doc.id ? 'border-primary bg-accent/50' : ''
                }`}
                onClick={() => loadDocument(doc.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{doc.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        v{doc.version} • {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(doc.id);
                        }}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col">
        {selectedDoc ? (
          <>
            {/* Editor Header */}
            <div className="p-4 border-b bg-card flex items-center justify-between">
              <div className="flex-1">
                <Input
                  value={editTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-2xl font-bold border-none focus-visible:ring-0 px-0"
                  placeholder="Document title..."
                />
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {selectedDoc.last_edited_by_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDistanceToNow(new Date(selectedDoc.updated_at), { addSuffix: true })}
                  </span>
                  <Badge variant="secondary">v{selectedDoc.version}</Badge>
                  {hasUnsavedChanges && (
                    <Badge variant="outline" className="text-orange-500">
                      Unsaved changes
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSaveDocument}
                  disabled={saving || !hasUnsavedChanges}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" size="icon" onClick={handleShowVersionHistory}>
                  <History className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleSaveAsTemplate}>
                      <FileText className="w-4 h-4 mr-2" />
                      Save as Template
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteDocument(selectedDoc.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Document
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto">
              {selectedDoc.document_type === 'latex' ? (
                <LaTeXEditor
                  documentId={selectedDoc.id}
                  initialContent={editContent}
                  onUpdate={(content) => handleContentChange(content)}
                />
              ) : (
                <CollaborativeEditor
                  documentId={selectedDoc.id}
                  initialContent={editContent}
                  onUpdate={(content) => handleContentChange(content)}
                  userName={localStorage.getItem('userName') || 'Anonymous'}
                  userColor="#3b82f6"
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No document selected</h3>
              <p className="text-sm mb-4">
                Select a document from the sidebar or create a new one
              </p>
              <Button onClick={handleShowTemplateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Create Document
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Start with a template or create a blank document
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {/* Document Type Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Document Type</label>
              <div className="grid grid-cols-2 gap-4">
                <Card
                  className={`cursor-pointer hover:border-primary transition-colors ${
                    selectedDocType === 'tiptap' ? 'border-primary bg-accent/50' : ''
                  }`}
                  onClick={() => setSelectedDocType('tiptap')}
                >
                  <CardContent className="p-4">
                    <div className="text-center">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <h3 className="font-semibold">Rich Text Editor</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Visual editor with diagrams, equations, tables, and more
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card
                  className={`cursor-pointer hover:border-primary transition-colors ${
                    selectedDocType === 'latex' ? 'border-primary bg-accent/50' : ''
                  }`}
                  onClick={() => setSelectedDocType('latex')}
                >
                  <CardContent className="p-4">
                    <div className="text-center">
                      <Code2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <h3 className="font-semibold">LaTeX Editor</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Professional typesetting for research papers and reports
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Template Selection (only show if not LaTeX or show LaTeX templates) */}
            {loadingTemplates ? (
              <div className="text-center py-8">Loading templates...</div>
            ) : (
              <div>
                <label className="text-sm font-medium mb-3 block">
                  {selectedDocType === 'latex' ? 'LaTeX Template' : 'Document Template'}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Blank Document Option */}
                  {selectedDocType === 'tiptap' && (
                    <Card
                      className={`cursor-pointer hover:border-primary transition-colors ${
                        selectedTemplate === null ? 'border-primary bg-accent/50' : ''
                      }`}
                      onClick={() => setSelectedTemplate(null)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <FileText className="w-8 h-8 text-muted-foreground mt-1" />
                          <div>
                            <h3 className="font-semibold">Blank Document</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Start from scratch with an empty document
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* LaTeX Templates (shown when LaTeX is selected) */}
                  {selectedDocType === 'latex' && (
                    <>
                      <Card
                        className={`cursor-pointer hover:border-primary transition-colors ${
                          selectedTemplate === 'latex-article' ? 'border-primary bg-accent/50' : ''
                        }`}
                        onClick={() => setSelectedTemplate('latex-article')}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <FileText className="w-8 h-8 text-primary mt-1" />
                            <div>
                              <h3 className="font-semibold">Article</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                Basic article template with sections
                              </p>
                              <Badge variant="outline" className="mt-2 text-xs">LaTeX</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card
                        className={`cursor-pointer hover:border-primary transition-colors ${
                          selectedTemplate === 'latex-report' ? 'border-primary bg-accent/50' : ''
                        }`}
                        onClick={() => setSelectedTemplate('latex-report')}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <FileText className="w-8 h-8 text-primary mt-1" />
                            <div>
                              <h3 className="font-semibold">Lab Report</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                Report template with chapters
                              </p>
                              <Badge variant="outline" className="mt-2 text-xs">LaTeX</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card
                        className={`cursor-pointer hover:border-primary transition-colors ${
                          selectedTemplate === 'latex-paper' ? 'border-primary bg-accent/50' : ''
                        }`}
                        onClick={() => setSelectedTemplate('latex-paper')}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <FileText className="w-8 h-8 text-primary mt-1" />
                            <div>
                              <h3 className="font-semibold">Research Paper</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                Full research paper with bibliography
                              </p>
                              <Badge variant="outline" className="mt-2 text-xs">LaTeX</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card
                        className={`cursor-pointer hover:border-primary transition-colors ${
                          selectedTemplate === 'latex-blank' ? 'border-primary bg-accent/50' : ''
                        }`}
                        onClick={() => setSelectedTemplate('latex-blank')}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <FileText className="w-8 h-8 text-muted-foreground mt-1" />
                            <div>
                              <h3 className="font-semibold">Blank LaTeX</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                Minimal LaTeX document
                              </p>
                              <Badge variant="outline" className="mt-2 text-xs">LaTeX</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {/* Tiptap Templates */}
                  {selectedDocType === 'tiptap' && templates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer hover:border-primary transition-colors ${
                        selectedTemplate === template.id ? 'border-primary bg-accent/50' : ''
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <FileText className="w-8 h-8 text-primary mt-1" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold truncate">{template.title}</h3>
                              {template.is_predefined && (
                                <Badge variant="secondary" className="text-xs">Official</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {template.description}
                            </p>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Optional Title Override */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Document Title (Optional)</label>
            <Input
              placeholder="Leave empty to use template title"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowTemplateDialog(false);
              setSelectedTemplate(null);
              setNewDocTitle('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateFromTemplate}>
              {selectedTemplate === null ? 'Create Blank' : 'Create from Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Document Dialog (Manual) */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>
              Add a new document to this project
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Document title"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateDocument()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDocument}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Sheet */}
      <Sheet open={showVersionHistory} onOpenChange={setShowVersionHistory}>
        <SheetContent side="right" className="w-full sm:w-[540px] sm:max-w-[540px]">
          <SheetHeader>
            <SheetTitle>Version History</SheetTitle>
            <SheetDescription>
              View and restore previous versions of this document
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {versions.length} version{versions.length !== 1 ? 's' : ''}
              </p>
              <Button size="sm" variant="outline" onClick={handleCreateManualSnapshot}>
                <Save className="w-4 h-4 mr-2" />
                Create Snapshot
              </Button>
            </div>

            <Separator />

            <ScrollArea className="h-[calc(100vh-240px)]">
              {loadingVersions ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading versions...
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No version history yet</p>
                </div>
              ) : (
                <div className="space-y-4 pr-4">
                  {versions.map((version) => (
                    <Card
                      key={version.id}
                      className={`cursor-pointer hover:border-primary transition-colors ${
                        selectedVersion?.id === version.id ? 'border-primary bg-accent/50' : ''
                      }`}
                      onClick={() => setSelectedVersion(version)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary">v{version.version}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          
                          <h4 className="font-medium text-sm">{version.title}</h4>
                          
                          {version.change_description && (
                            <p className="text-sm text-muted-foreground">
                              {version.change_description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />
                            {version.created_by_name}
                          </div>

                          {selectedVersion?.id === version.id && (
                            <div className="mt-4 space-y-3">
                              <Separator />
                              <div className="max-h-[200px] overflow-y-auto">
                                <p className="text-xs font-mono bg-muted p-3 rounded whitespace-pre-wrap">
                                  {version.content.slice(0, 500)}
                                  {version.content.length > 500 && '...'}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestoreVersion(version.id);
                                }}
                              >
                                <History className="w-4 h-4 mr-2" />
                                Restore This Version
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ProjectWorkspace;
