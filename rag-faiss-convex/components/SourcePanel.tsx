import React from "react";

export interface SourceHit {
  sourceKey: string;
  score: number;
  docId: string;
  docTitle: string;
  chunkId: string;
  chunkIndex: number;
  snippet: string;
  chunkText: string;
  sourceUrl?: string | null;
}

interface SourcePanelProps {
  sources: SourceHit[];
  onOpenSource: (source: SourceHit) => void;
}

function SourceIcon({ sourceKey }: { sourceKey: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    gdrive: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 19h20L12 2z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    confluence: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19h16M4 15h16M4 11h16M4 7h16" strokeLinecap="round"/>
      </svg>
    ),
    slack: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 12h8M12 8v8" strokeLinecap="round"/>
        <rect x="4" y="4" width="16" height="16" rx="4"/>
      </svg>
    ),
    notion: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
        <path d="M8 8h8M8 12h6" strokeLinecap="round"/>
      </svg>
    ),
  };

  return (
    <span className="source-type-icon">
      {iconMap[sourceKey] || (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="2"/>
          <path d="M8 10h8M8 14h5" strokeLinecap="round"/>
        </svg>
      )}
    </span>
  );
}

export function SourcePanel({ sources, onOpenSource }: SourcePanelProps) {
  return (
    <div className="sources-panel">
      <div className="sources-panel-header">
        <h2>Retrieved Sources</h2>
        <p>{sources.length > 0 ? `${sources.length} sources found` : "Ask a question to see relevant sources"}</p>
      </div>

      {sources.length === 0 ? (
        <div className="no-sources">
          <div className="no-sources-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="6" width="32" height="36" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M14 14h20M14 22h16M14 30h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
              <circle cx="32" cy="32" r="8" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3"/>
              <path d="M38 38l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
            </svg>
          </div>
          <div className="no-sources-text">
            Sources from your documents will appear here after you send a message.
          </div>
        </div>
      ) : (
        <div className="sources-list">
          {sources.map((source, index) => (
            <div
              key={`${source.chunkId}-${index}`}
              className="source-item"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="source-header">
                <div className="source-info">
                  <div className="source-name">{source.docTitle}</div>
                  <div className="source-meta">
                    <span className="source-badge">
                      <SourceIcon sourceKey={source.sourceKey} />
                      {source.sourceKey}
                    </span>
                    <span className="source-chunk">Chunk {source.chunkIndex + 1}</span>
                  </div>
                </div>
              </div>
              <div className="source-snippet">{source.snippet}</div>
              <div className="source-footer">
                <div className="source-score">
                  <div className="score-bar">
                    <div
                      className="score-fill"
                      style={{ width: `${Math.min(source.score * 100, 100)}%` }}
                    />
                  </div>
                  <div className="score-text">
                    {(source.score * 100).toFixed(0)}% relevance
                  </div>
                </div>
                <button
                  type="button"
                  className="source-open-button"
                  onClick={() => onOpenSource(source)}
                >
                  <span>View</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17L17 7M17 7H7M17 7v10" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
