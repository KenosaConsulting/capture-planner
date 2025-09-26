import React, { useState, useEffect, useMemo } from 'react';

interface OutputDisplayProps {
  response: string;
}

type Tab = 'Briefing' | 'Signals Ledger' | 'Themes Rollup' | 'Source Index';

const OutputDisplay: React.FC<OutputDisplayProps> = ({ response }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Briefing');

  const parsedOutput = useMemo(() => {
    console.log('Parsing response of length:', response.length);
    
    // Initialize result object
    let result = {
      briefing: '',
      signalsLedger: null as any,
      themesRollup: null as any,
      sourceIndex: null as any,
    };
    
    // Extract markdown briefing (including Executive Briefing and Strategic Capture Plays)
    const briefingMatch = response.match(/```markdown\n([\s\S]*?)\n```/);
    const playsMatch = response.match(/## Strategic Capture Plays\n\n```markdown\n([\s\S]*?)\n```/);
    
    // Combine briefing and plays if both exist
    if (briefingMatch) {
      result.briefing = briefingMatch[1];
    }
    if (playsMatch) {
      result.briefing += '\n\n## Strategic Capture Plays\n\n' + playsMatch[1];
    }
    
    // If no markdown blocks found, try to extract the briefing text directly
    if (!result.briefing) {
      // Look for content between the start and first JSON block
      const firstJsonIndex = response.indexOf('```json');
      if (firstJsonIndex > 0) {
        result.briefing = response.substring(0, firstJsonIndex).trim();
      } else {
        result.briefing = response; // Use entire response if no JSON found
      }
    }
    
    // Extract Technical Annex (contains signals, themes, sources)
    const technicalAnnexMatch = response.match(/## Technical Annex\n\n```json\n([\s\S]*?)\n```/);
    if (technicalAnnexMatch) {
      try {
        const annexData = JSON.parse(technicalAnnexMatch[1]);
        result.signalsLedger = annexData.signals_ledger || null;
        result.themesRollup = annexData.themes_rollup || null;
        result.sourceIndex = annexData.source_index || null;
        console.log('Parsed Technical Annex:', {
          signals: result.signalsLedger?.length,
          themes: result.themesRollup?.length,
          sources: result.sourceIndex?.length
        });
      } catch (e) {
        console.error('Failed to parse Technical Annex:', e);
      }
    }
    
    // If no Technical Annex found, try to find individual JSON blocks
    if (!result.signalsLedger || !result.themesRollup || !result.sourceIndex) {
      const jsonBlocks = [...response.matchAll(/```json\n([\s\S]*?)\n```/g)];
      console.log('Found', jsonBlocks.length, 'JSON blocks');
      
      jsonBlocks.forEach((match, index) => {
        try {
          const data = JSON.parse(match[1]);
          
          // Identify the content by its structure
          if (data.signals_ledger || (Array.isArray(data) && data[0]?.signal)) {
            result.signalsLedger = data.signals_ledger || data;
            console.log('Found signals_ledger at block', index);
          } else if (data.themes_rollup || (Array.isArray(data) && data[0]?.theme)) {
            result.themesRollup = data.themes_rollup || data;
            console.log('Found themes_rollup at block', index);
          } else if (data.source_index || (Array.isArray(data) && data[0]?.source)) {
            result.sourceIndex = data.source_index || data;
            console.log('Found source_index at block', index);
          } else if (data.total_value !== undefined) {
            // This is procurement metrics - could add as separate tab later
            console.log('Found procurement metrics at block', index);
          } else if (data.sections_emitted) {
            // This is diagnostics - ignore for display
            console.log('Found diagnostics at block', index);
          }
        } catch (e) {
          console.error(`Failed to parse JSON block ${index}:`, e);
        }
      });
    }
    
    console.log('Final parsed output:', {
      briefingLength: result.briefing.length,
      hasSignals: !!result.signalsLedger,
      hasThemes: !!result.themesRollup,
      hasSources: !!result.sourceIndex
    });
    
    return result;
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
    
    // Handle both array and object formats
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
          
          // Handle bold text with proper regex
          if (line.includes('**')) {
            const parts = line.split(/\*\*(.*?)\*\*/g);
            const formatted = parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="text-lightest-slate font-semibold">{part}</strong> : part
            );
            return <p key={idx} className="mb-2">{formatted}</p>;
          }
          
          // Handle bullet points with indentation support
          const bulletMatch = line.match(/^(\s*)[\*\-]\s+(.*)$/);
          if (bulletMatch) {
            const indent = bulletMatch[1].length;
            const content = bulletMatch[2];
            return (
              <li key={idx} className={`ml-${4 + indent} mb-1 list-disc`}>
                {content}
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