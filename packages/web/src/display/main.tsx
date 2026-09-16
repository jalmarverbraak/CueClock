import React from 'react';
import { createRoot } from 'react-dom/client';
import { Display } from './Display';
import '../shared/base.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Display />
  </React.StrictMode>,
);
