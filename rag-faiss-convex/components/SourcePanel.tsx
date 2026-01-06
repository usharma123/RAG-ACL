import React from "react";

export interface SourceScore {
  sourceKey: string;
  score: number;
}

interface SourcePanelProps {
  sources: SourceScore[];
}

export function SourcePanel({ sources }: SourcePanelProps) {
  return (
    <div className="sources-panel">
      <h2>Retrieved Sources</h2>

      {sources.length === 0 ? (
        <p className="no-sources">
          Sources will appear here after you send a message.
        </p>
      ) : (
        sources.map((source, index) => (
          <div key={`${source.sourceKey}-${index}`} className="source-item">
            <div className="source-name">{source.sourceKey}</div>
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
