import React from 'react';
import { Blog } from './components/Blog';

const App: React.FC = () => {
  return (
    <div className="min-h-screen font-sans text-primary transition-colors duration-300">
      <Blog />
    </div>
  );
};

export default App;