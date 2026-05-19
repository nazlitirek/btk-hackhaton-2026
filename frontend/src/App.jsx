import React, { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import StandardSearch from './components/StandardSearch';
import LLMSearch from './components/LLMSearch';

function App() {
  const [mode, setMode] = useState('standard'); // 'standard' or 'llm'

  return (
    <div className="app-container">
      <header className="header">
        <h1>Akıllı Mağaza</h1>
        <div className="mode-toggle">
          <button 
            className={`mode-btn ${mode === 'standard' ? 'active' : ''}`}
            onClick={() => setMode('standard')}
          >
            <Search size={18} />
            Standart Arama
          </button>
          <button 
            className={`mode-btn ${mode === 'llm' ? 'active' : ''}`}
            onClick={() => setMode('llm')}
          >
            <Sparkles size={18} />
            Yapay Zeka ile Arama
          </button>
        </div>
      </header>

      <main className="main-content">
        {mode === 'standard' ? <StandardSearch /> : <LLMSearch />}
      </main>
    </div>
  );
}

export default App;
