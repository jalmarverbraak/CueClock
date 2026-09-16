import React from 'react';
import { createRoot } from 'react-dom/client';
import { Control } from './Control';
import '../shared/base.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Control />
  </React.StrictMode>,
);
