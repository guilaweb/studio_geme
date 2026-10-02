'use client';

import { marked } from 'marked';
import { useEffect, useState, useRef }from 'react';

interface MarkdownViewerProps {
  markdownContent: string;
  onContentChange?: (newContent: string) => void;
}

export function MarkdownViewer({ markdownContent, onContentChange }: MarkdownViewerProps) {
  const [htmlContent, setHtmlContent] = useState('');
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (markdownContent) {
      const parsedHtml = marked.parse(markdownContent, { gfm: true, breaks: true });
      setHtmlContent(parsedHtml as string);
    } else {
      setHtmlContent('');
    }
  }, [markdownContent]);

  // Effect to make checkboxes interactive
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !onContentChange) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLInputElement;
      if (target.tagName === 'INPUT' && target.type === 'checkbox') {
        const index = parseInt(target.dataset.index || '-1', 10);
        if (index === -1) return;

        const lines = markdownContent.split('\n');
        let checkboxCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const match = line.match(/^(\s*)-\s*\[( |x|X)\]/);
          if (match) {
            if (checkboxCount === index) {
              const isChecked = target.checked;
              lines[i] = line.replace(/\[( |x|X)\]/, `[${isChecked ? 'x' : ' '}]`);
              break;
            }
            checkboxCount++;
          }
        }
        
        const newContent = lines.join('\n');
        onContentChange(newContent);
      }
    };

    viewer.addEventListener('click', handleClick);

    // Add data-index to checkboxes for identification
    const checkboxes = viewer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes.forEach((checkbox, index) => {
      checkbox.dataset.index = index.toString();
      // Ensure the checkbox reflects the current state from the markdown
      const line = markdownContent.split('\n').find(l => {
          const match = l.match(/^(\s*)-\s*\[( |x|X)\]/);
          if(match) {
            // This is not perfect as it doesn't map directly, but it's a good approximation
            return true;
          }
          return false;
      });
    });

    return () => {
      viewer.removeEventListener('click', handleClick);
    };
  }, [htmlContent, markdownContent, onContentChange]);

  return (
    <div
      ref={viewerRef}
      className="prose prose-sm dark:prose-invert max-w-none 
                 prose-h1:font-bold prose-h1:mb-2
                 prose-h2:text-lg prose-h2:font-semibold prose-h2:mt-4 prose-h2:mb-1
                 prose-h3:font-semibold prose-h3:mt-3 prose-h3:mb-1
                 prose-p:my-1
                 prose-ul:my-2
                 prose-li:my-1
                 prose-strong:font-bold
                 prose-input:mx-2 prose-input:cursor-pointer"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
