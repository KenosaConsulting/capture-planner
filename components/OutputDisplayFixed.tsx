import React, { useState, useEffect, useMemo } from 'react';

interface OutputDisplayProps {
  response: string;
}

type Tab = 'Briefing' | 'Signals Ledger' | 'Themes Rollup' | 'Source Index';

const OutputDisplay: React.FC<OutputDisplayProps> = ({ response }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Briefing');

  const parsedOutput = useMemo(() => {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/g;
    const matches = [...response.matchAll(jsonRegex)];
    
    // Robustly extract the briefing by removing all matched JSON blocks
    let briefing = response;
    for (const match of matches) {
      if (match[0]) {
        briefing = briefing.replace(match[0], '');
      }
    }
    
    // Also remove markdown code blocks to get clean text
    briefing = briefing.replace(/```markdown\n([\s\S]*?)\n```/g, '$1');
    briefing = briefing.trim();
    
    const parseJsonSafe = (jsonString: string | undefined) => {
      if (!jsonString) return null;
      try {
        return JSON.parse(jsonString);
      } catch (e) {
        console.error(`Error parsing JSON block:`, e);
        return { error: 'Failed to parse JSON', content: jsonString };
      }
    };
    
    return {
      briefing,
      signalsLedger: parseJsonSafe(matches[0]?.[1]),
      themesRollup: parseJsonSafe(matches[1]?.[1]),
      sourceIndex: parseJsonSafe(matches[2]?.[1]),
    };
  }, [response]);

  const renderJson = (data: any) => {
    if (data === null) {
      return <InfoMessage>The AI model did not generate content for this section.</InfoMessage>;
    }
    if (data?.error) {
      return (
        <div>
          <ErrorMessage title="JSON Parsing Error">
            The AI model returned malformed JSON for this section, which could not be displayed.
          </ErrorMessage>
          <pre className="w-full h-full overflow-auto mt-4 bg-navy p-2 rounded">
            <code className="text-sm text-light-slate">{data.content}</code>
          </pre>
        </div>
      );
    }
    const jsonString = JSON.stringify(data, null, 2);
    return (
      <pre className="w-full h-full overflow-auto bg-navy p-4 rounded">
        <code className="text-sm text-light-slate">{jsonString}</code>
      </pre>
    );
  };
  
  const InfoMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex-grow flex items-center justify-center text-center text-slate">
      <p>{children}</p>
    </div>
  );
  
  const ErrorMessage: React.FC<{ children: React.ReactNode, title: string }> = ({ children, title }) => (
     <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-md">
        <h3 className="font-bold">{title}</h3>
        <p>{children}</p>
      </div>
  );

  const tabs: Tab[] = ['Briefing', 'Signals Ledger', 'Themes Rollup', 'Source Index'];

  // Render markdown-ish content as formatted text (no external dependencies)
  const renderBriefing = (content: string) => {
    if (!content) {
      return <InfoMessage>The AI model did not generate a briefing in its response.</InfoMessage>;
    }

    // Basic formatting without external markdown libraries
    const lines = content.split('\n');
    
    return (
      <div className="prose-style space-y-4 text-light-slate">
        {lines.map((line, idx) => {
          // Handle headers
          if (line.startsWith('## ')) {
            return <h2 key={idx} className="text-xl font-bold text-lightest-slate mt-6 mb-3">{line.replace('## ', '')}</h2>;
          }
          if (line.startsWith('# ')) {
            return <h1 key={idx} className="text-2xl font-bold text-lightest-slate mt-6 mb-4">{line.replace('# ', '')}</h1>;
          }
          if (line.startsWith('### ')) {
            return <h3 key={idx} className="text-lg font-semibold text-lightest-slate mt-4 mb-2">{line.replace('### ', '')}</h3>;
          }
          
          // Handle bold text
          if (line.includes('**')) {
            const formatted = line.split('**').map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="text-lightest-slate font-semibold">{part}</strong> : part
            );
            return <p key={idx} className="mb-2">{formatted}</p>;
          }
          
          // Handle bullet points
          if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
            return (
              <li key={idx} className="ml-4 mb-1 list-disc">
                {line.replace(/^[\*\-]\s+/, '')}
              </li>
            );
          }
          
          // Handle numbered lists
          if (/^\d+\.\s/.test(line.trim())) {
            return (
              <li key={idx} className="ml-4 mb-1 list-decimal">
                {line.replace(/^\d+\.\s+/, '')}
              </li>
            );
          }
          
          // Regular paragraphs
          if (line.trim()) {
            return <p key={idx} className="mb-2">{line}</p>;
          }
          
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-lightest-navy/50 mb-4">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${
                activeTab === tab
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-slate hover:text-light-slate hover:border-slate'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-grow overflow-y-auto pr-2">
        {activeTab === 'Briefing' && renderBriefing(parsedOutput.briefing)}
        {activeTab === 'Signals Ledger' && renderJson(parsedOutput.signalsLedger)}
        {activeTab === 'Themes Rollup' && renderJson(parsedOutput.themesRollup)}
        {activeTab === 'Source Index' && renderJson(parsedOutput.sourceIndex)}
      </div>
    </div>
  );
};

export default OutputDisplay;