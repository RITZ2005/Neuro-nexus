import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Eye, 
  Code2, 
  Download, 
  Copy,
  BookOpen,
  Columns2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import 'katex/dist/katex.min.css';

interface LaTeXEditorProps {
  documentId: string;
  initialContent: string;
  onUpdate?: (content: string) => void;
}

const LATEX_TEMPLATES = {
  article: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\title{Your Research Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
Write your abstract here.
\\end{abstract}

\\section{Introduction}
Your introduction text here.

\\section{Methodology}
Describe your methodology.

\\section{Results}
Present your results.

\\section{Conclusion}
Conclude your work.

\\end{document}`,
  
  report: `\\documentclass{report}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{Lab Report Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle
\\tableofcontents

\\chapter{Introduction}
Introduction to the experiment.

\\chapter{Materials and Methods}
\\section{Materials}
List of materials used.

\\section{Methods}
Describe the experimental procedure.

\\chapter{Results}
Present your experimental results.

\\chapter{Discussion}
Discuss the implications of your results.

\\chapter{Conclusion}
Summarize your findings.

\\end{document}`,
  
  paper: `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}
\\usepackage{cite}
\\usepackage{hyperref}

\\title{Research Paper Title:\\\\A Comprehensive Study}
\\author{Author Name\\textsuperscript{1}, Co-Author Name\\textsuperscript{2}\\\\
\\small \\textsuperscript{1}Department, University\\\\
\\small \\textsuperscript{2}Department, University}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
\\noindent
Research abstract goes here. Summarize the key findings, methodology, and conclusions in 150-250 words.
\\end{abstract}

\\section{Introduction}
\\label{sec:intro}
Background and motivation for the research.

\\subsection{Research Question}
State your research question clearly.

\\section{Literature Review}
Review relevant previous work.

\\section{Methodology}
\\subsection{Data Collection}
Describe data collection methods.

\\subsection{Analysis}
Explain analytical approaches.

\\section{Results}
\\subsection{Key Findings}
Present main results.

\\begin{equation}
E = mc^2
\\label{eq:einstein}
\\end{equation}

\\section{Discussion}
Interpret and discuss results.

\\section{Conclusion}
Summarize findings and future work.

\\begin{thebibliography}{9}
\\bibitem{ref1} Author. \\textit{Title}. Publisher, Year.
\\end{thebibliography}

\\end{document}`,
  
  blank: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}

\\title{Document Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

Write your content here.

\\end{document}`
};

export const LaTeXEditor: React.FC<LaTeXEditorProps> = ({
  documentId,
  initialContent,
  onUpdate
}) => {
  const [latexCode, setLatexCode] = useState(initialContent || LATEX_TEMPLATES.blank);
  const [viewMode, setViewMode] = useState<'split' | 'code' | 'preview'>('split');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledHTML, setCompiledHTML] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (initialContent) {
      setLatexCode(initialContent);
    }
  }, [initialContent]);

  useEffect(() => {
    const timer = setTimeout(() => {
      compileLatex();
    }, 1000); // Debounce compilation

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latexCode]);

  const compileLatex = () => {
    setIsCompiling(true);
    try {
      // Simple LaTeX to HTML conversion for preview
      // This is a simplified version - for production, you'd use a proper LaTeX compiler
      let html = latexCode;
      
      // Convert basic LaTeX commands to HTML
      html = html.replace(/\\title\{([^}]+)\}/g, '<h1 class="text-3xl font-bold mb-4">$1</h1>');
      html = html.replace(/\\author\{([^}]+)\}/g, '<p class="text-lg text-muted-foreground mb-2">$1</p>');
      html = html.replace(/\\date\{([^}]+)\}/g, '<p class="text-sm text-muted-foreground mb-6">$1</p>');
      
      html = html.replace(/\\section\{([^}]+)\}/g, '<h2 class="text-2xl font-bold mt-6 mb-3">$1</h2>');
      html = html.replace(/\\subsection\{([^}]+)\}/g, '<h3 class="text-xl font-semibold mt-4 mb-2">$1</h3>');
      html = html.replace(/\\subsubsection\{([^}]+)\}/g, '<h4 class="text-lg font-medium mt-3 mb-2">$1</h4>');
      
      html = html.replace(/\\chapter\{([^}]+)\}/g, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>');
      
      html = html.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
      html = html.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>');
      html = html.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>');
      
      html = html.replace(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/g, 
        '<div class="bg-muted p-4 rounded-lg mb-6"><h3 class="font-semibold mb-2">Abstract</h3><p>$1</p></div>');
      
      html = html.replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, 
        '<div class="my-4 text-center bg-muted p-4 rounded">$1</div>');
      
      html = html.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (match, content) => {
        const items = content.match(/\\item\s+([^\n\\]+)/g);
        if (items) {
          const listItems = items.map((item: string) => 
            `<li class="ml-4">${item.replace(/\\item\s+/, '')}</li>`
          ).join('');
          return `<ul class="list-disc my-4">${listItems}</ul>`;
        }
        return match;
      });
      
      html = html.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (match, content) => {
        const items = content.match(/\\item\s+([^\n\\]+)/g);
        if (items) {
          const listItems = items.map((item: string) => 
            `<li class="ml-4">${item.replace(/\\item\s+/, '')}</li>`
          ).join('');
          return `<ol class="list-decimal my-4">${listItems}</ol>`;
        }
        return match;
      });
      
      // Remove LaTeX commands that don't need rendering
      html = html.replace(/\\documentclass(\[.*?\])?\{.*?\}/g, '');
      html = html.replace(/\\usepackage(\[.*?\])?\{.*?\}/g, '');
      html = html.replace(/\\begin\{document\}/g, '');
      html = html.replace(/\\end\{document\}/g, '');
      html = html.replace(/\\maketitle/g, '');
      html = html.replace(/\\tableofcontents/g, '<div class="bg-muted p-4 rounded mb-4"><strong>Table of Contents</strong></div>');
      html = html.replace(/\\label\{.*?\}/g, '');
      html = html.replace(/\\noindent/g, '');
      html = html.replace(/\\\\/, '<br/>');
      html = html.replace(/\\today/g, new Date().toLocaleDateString());
      
      // Handle bibliography
      html = html.replace(/\\begin\{thebibliography\}\{.*?\}([\s\S]*?)\\end\{thebibliography\}/g, 
        '<div class="mt-8"><h2 class="text-2xl font-bold mb-4">References</h2><ol class="list-decimal ml-8">$1</ol></div>');
      html = html.replace(/\\bibitem\{.*?\}\s*/g, '<li class="mb-2">');
      
      // Clean up extra whitespace
      html = html.replace(/\n\n+/g, '</p><p class="mb-4">');
      html = html.replace(/^\s*%.*$/gm, ''); // Remove comments
      
      setCompiledHTML(html);
      onUpdate?.(latexCode);
    } catch (error) {
      console.error('LaTeX compilation error:', error);
      toast({
        title: 'Compilation Error',
        description: 'There was an error compiling your LaTeX code.',
        variant: 'destructive'
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const handleTemplateChange = (template: keyof typeof LATEX_TEMPLATES) => {
    setLatexCode(LATEX_TEMPLATES[template]);
    toast({
      title: 'Template Loaded',
      description: `${template.charAt(0).toUpperCase() + template.slice(1)} template loaded successfully.`
    });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(latexCode);
    toast({
      title: 'Copied!',
      description: 'LaTeX code copied to clipboard.'
    });
  };

  const handleDownload = () => {
    const blob = new Blob([latexCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-${documentId}.tex`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Downloaded!',
      description: 'LaTeX file downloaded successfully.'
    });
  };

  const handleDownloadHTML = () => {
    // Create a complete HTML document with styling
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LaTeX Document</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      color: #333;
      background: #fff;
    }
    h1 {
      font-size: 2em;
      font-weight: bold;
      margin: 1.5em 0 0.5em 0;
      text-align: center;
    }
    h2 {
      font-size: 1.5em;
      font-weight: bold;
      margin: 1.2em 0 0.5em 0;
      border-bottom: 1px solid #ddd;
      padding-bottom: 0.3em;
    }
    h3 {
      font-size: 1.2em;
      font-weight: bold;
      margin: 1em 0 0.5em 0;
    }
    h4 {
      font-size: 1.1em;
      font-weight: bold;
      margin: 0.8em 0 0.5em 0;
    }
    p {
      margin: 0.5em 0;
      text-align: justify;
    }
    .abstract {
      background: #f5f5f5;
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
      border-left: 4px solid #333;
    }
    .abstract h3 {
      margin-top: 0;
      font-size: 1em;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .equation {
      text-align: center;
      margin: 20px 0;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 5px;
      font-style: italic;
    }
    ul, ol {
      margin: 1em 0;
      padding-left: 40px;
    }
    li {
      margin: 0.5em 0;
    }
    strong {
      font-weight: bold;
    }
    em {
      font-style: italic;
    }
    .references {
      margin-top: 40px;
    }
    .references h2 {
      font-size: 1.5em;
      margin-bottom: 1em;
    }
    .references ol {
      counter-reset: reference-counter;
      list-style: none;
      padding-left: 0;
    }
    .references li {
      counter-increment: reference-counter;
      margin-bottom: 1em;
      padding-left: 2em;
      position: relative;
    }
    .references li:before {
      content: "[" counter(reference-counter) "]";
      position: absolute;
      left: 0;
      font-weight: bold;
    }
    .toc {
      background: #f5f5f5;
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
    }
    @media print {
      body {
        margin: 0;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  ${compiledHTML}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-${documentId}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Downloaded!',
      description: 'HTML document downloaded successfully. You can open it in a browser or print to PDF.'
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b bg-card p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <span className="font-semibold">LaTeX Editor</span>
          <span className="text-xs text-muted-foreground">
            {isCompiling ? 'Compiling...' : 'Ready'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Template Selector */}
          <Select onValueChange={(value) => handleTemplateChange(value as keyof typeof LATEX_TEMPLATES)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Load Template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="article">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Article</span>
                </div>
              </SelectItem>
              <SelectItem value="report">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Lab Report</span>
                </div>
              </SelectItem>
              <SelectItem value="paper">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Research Paper</span>
                </div>
              </SelectItem>
              <SelectItem value="blank">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Blank Document</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'code' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('code')}
              className="rounded-r-none"
            >
              <Code2 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'split' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('split')}
              className="rounded-none border-x"
            >
              <Columns2 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('preview')}
              className="rounded-l-none"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleCopyCode}>
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>

          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download .tex
          </Button>

          <Button variant="outline" size="sm" onClick={handleDownloadHTML}>
            <Download className="w-4 h-4 mr-2" />
            Download HTML
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* LaTeX Code Editor */}
        {(viewMode === 'code' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} border-r flex flex-col overflow-hidden`}>
            <div className="bg-muted px-3 py-2 border-b flex-shrink-0">
              <span className="text-sm font-medium">LaTeX Source</span>
            </div>
            <textarea
              value={latexCode}
              onChange={(e) => setLatexCode(e.target.value)}
              className="flex-1 w-full p-4 font-mono text-sm bg-background border-none focus:outline-none resize-none leading-relaxed overflow-auto"
              placeholder="Enter your LaTeX code here..."
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview Panel */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col overflow-hidden`}>
            <div className="bg-muted px-3 py-2 border-b flex-shrink-0">
              <span className="text-sm font-medium">Preview</span>
            </div>
            <ScrollArea className="flex-1">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 max-w-4xl mx-auto"
              >
                <div 
                  className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: compiledHTML || '<p class="text-muted-foreground">Preview will appear here...</p>' }}
                />
              </motion.div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="border-t bg-muted/30 px-3 py-1 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Lines: {latexCode.split('\n').length}</span>
          <span>Characters: {latexCode.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Auto-compile enabled
          </span>
        </div>
      </div>
    </div>
  );
};
