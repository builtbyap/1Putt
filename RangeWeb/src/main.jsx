import './pitraxBridge';
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')).render(<App />);

// Browser preview only: open the dev server with ?demo to see sample shots.
if (new URLSearchParams(window.location.search).has('demo')) {
  window.PITRAX.setSession({
    selectedId: 2,
    shots: [
      { id: 2, carry: '235.1', total: '252.4', curve: '5L', clubSpeed: '94.6', ballSpeed: '143.3', smash: '1.51', spin: '4110', attack: '-1.2', path: '2.1', faceToPath: '-1.4', apexYds: 30, offlineFt: -15, cameraAngle: 2, timestamp: 'Live shot' },
      { id: 1, carry: '212.8', total: '228.0', curve: '8R', clubSpeed: '92.1', ballSpeed: '136.9', smash: '1.49', spin: '4580', attack: '-2.0', path: '3.4', faceToPath: '1.8', apexYds: 27, offlineFt: 24, cameraAngle: 2, timestamp: 'Live shot' },
    ],
  });
}
