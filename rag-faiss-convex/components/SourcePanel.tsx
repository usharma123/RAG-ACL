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

export function SourcePanel({ sources, onOpenSource }: SourcePanelProps) {
  return (
    <div className="sources-panel">
      <h2>Retrieved Sources</h2>

      {sources.length === 0 ? (
        <p className="no-sources">
          Sources will appear here after you send a message.
        </p>
      ) : (
        sources.map((source, index) => (
          <div key={`${source.chunkId}-${index}`} className="source-item">
            <div className="source-header">
              <div>
                <div className="source-name">{source.docTitle}</div>
                <div className="source-meta">{source.sourceKey}</div>
              </div>
              <button
                type="button"
                className="source-open-button"
                onClick={() => onOpenSource(source)}
              >
                Open section
              </button>
            </div>
            <div className="source-snippet">{source.snippet}</div>
            <div className="score-bar">
              <div
                className="score-fill"
                style={{ width: `${Math.min(source.score * 100, 100)}%` }}
              />
            </div>
            <div className="score-text">
              Relevance: {(source.score * 100).toFixed(1)}%
            </div>
          </div>
        ))
      )}
    </div>
  );
}
