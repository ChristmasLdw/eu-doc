"use client";

import { useState } from "react";
import { Download, ExternalLink, Maximize2, X } from "lucide-react";
import { Button } from "./button";

interface PdfViewerProps {
  url: string;
  title?: string;
  className?: string;
}

export function PdfViewer({ url, title, className = "" }: PdfViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <div className={`relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 ${className}`}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {title || "Document"}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setIsFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4 mr-1" />
              <span className="text-xs">Fullscreen</span>
            </Button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center h-8 px-2 text-xs rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </a>
            <a
              href={url}
              download
              className="inline-flex items-center h-8 px-2 text-xs rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </a>
          </div>
        </div>

        {/* PDF Embed */}
        <iframe
          src={`${url}#toolbar=0&navpanes=0`}
          className="w-full h-[500px] border-0"
          title={title || "PDF Document"}
        />
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
            <span className="text-sm font-medium text-white truncate">
              {title || "Document"}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={url}
                download
                className="inline-flex items-center h-8 px-3 text-xs text-white rounded-md hover:bg-white/20 transition-colors"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8"
                onClick={() => setIsFullscreen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <iframe
            src={`${url}#toolbar=1&navpanes=1`}
            className="flex-1 w-full border-0"
            title={title || "PDF Document"}
          />
        </div>
      )}
    </>
  );
}
