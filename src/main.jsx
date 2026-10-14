import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Uygulama from './Uygulama.jsx';
import { OturumSaglayici } from './oturum.jsx';
import './stil.css';

createRoot(document.getElementById('kok')).render(
  <React.StrictMode>
    <BrowserRouter>
      <OturumSaglayici>
        <Uygulama />
      </OturumSaglayici>
    </BrowserRouter>
  </React.StrictMode>,
);
