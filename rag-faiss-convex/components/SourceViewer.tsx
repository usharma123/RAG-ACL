import React, { useEffect, useMemo, useRef } from "react";
import { SourceHit } from "./SourcePanel";

export interface SourceDocument {
  id: string;
  title: string;
  sourceKey: string;
  rawText: string;
  sourceUrl?: string | null;
}

interface SourceViewerProps {
  hit: SourceHit;
  document: SourceDocument | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export function SourceViewer({ hit, document, loading, error, onClose }: SourceViewerProps) {
  const highlightRef = useRef<HTMLSpanElement>(null);

  const highlight = useMemo(() => {
    const text = document?.rawText || "";
    const target = hit.chunkText || hit.snippet;
    if (!target) {
      return { before: text, match: "", after: "" };
    }
    const index = text.indexOf(target);
    if (index === -1) {
      return { before: text, match: "", after: "" };
    }
    return {
      before: text.slice(0, index),
      match: text.slice(index, index + target.length),
      after: text.slice(index + target.length),
    };
  }, [document, hit.chunkText, hit.snippet]);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ block: "center" });
    }
  }, [document, hit.chunkId]);

  return (
    <div className="source-modal-overlay" onClick={onClose}>
      <div className="source-modal" onClick={(e) => e.stopPropagation()}>
        <div className="source-modal-header">
          <div className="source-modal-info">
            <div className="source-modal-title">{document?.title || hit.docTitle}</div>
            <div className="source-modal-meta">
              <span className="source-modal-badge">{hit.sourceKey}</span>
              <span className="source-modal-chunk">Chunk {hit.chunkIndex + 1}</span>
            </div>
          </div>
          <button type="button" className="source-close-button" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Close
          </button>
        </div>
        <div className="source-modal-body">
          {loading && (
            <div className="source-loading">
              <div className="source-loading-spinner"></div>
              <span>Loading document...</span>
            </div>
          )}
          {!loading && error && (
            <div className="source-error">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
              </svg>
              <span>{error}</span>
            </div>
          )}
          {!loading && !error && document && (
            <>
              {document.sourceUrl && (
                <a
                  className="source-doc-link"
                  href={document.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Open original source
                </a>
              )}
              <div className="source-doc-text">
                {highlight.match ? (
                  <>
                    {highlight.before}
                    <mark ref={highlightRef}>{highlight.match}</mark>
                    {highlight.after}
                  </>
                ) : (
                  document.rawText
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
