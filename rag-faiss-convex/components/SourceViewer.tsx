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
          <div>
            <div className="source-modal-title">{document?.title || hit.docTitle}</div>
            <div className="source-modal-meta">{hit.sourceKey}</div>
          </div>
          <button type="button" className="source-close-button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="source-modal-body">
          {loading && <div className="source-loading">Loading document...</div>}
          {!loading && error && <div className="source-error">{error}</div>}
          {!loading && !error && document && (
            <>
              {document.sourceUrl && (
                <a
                  className="source-doc-link"
                  href={document.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
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
