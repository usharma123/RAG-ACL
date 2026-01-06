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
      <div className="sources-panel-header">
        <h2>Retrieved Sources</h2>
        <p>{sources.length > 0 ? `${sources.length} sources found` : "Ask a question to see relevant sources"}</p>
      </div>

      {sources.length === 0 ? (
        <div className="no-sources">
          <div className="no-sources-icon">📚</div>
          <div className="no-sources-text">
            Sources from your documents will appear here after you send a message.
          </div>
        </div>
      ) : (
        <div className="sources-list">
          {sources.map((source, index) => (
            <div key={`${source.chunkId}-${index}`} className="source-item">
              <div className="source-header">
                <div className="source-info">
                  <div className="source-name">{source.docTitle}</div>
                  <div className="source-meta">
                    <span className="source-badge">{source.sourceKey}</span>
                    <span>Chunk {source.chunkIndex + 1}</span>
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
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
