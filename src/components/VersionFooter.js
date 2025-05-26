'use client'; // if using app directory

import { useEffect, useState } from 'react';

export default function VersionFooter() {
  const [versionInfo, setVersionInfo] = useState(null);

  useEffect(() => {
    fetch('/version.json')
      .then((res) => res.json())
      .then(setVersionInfo)
      .catch(console.error);
  }, []);

  if (!versionInfo) return null;

  return (
    <footer style={{
      position: 'fixed',
      bottom: 10,
      right: 10,
      fontSize: '0.75rem',
      fontFamily: 'monospace',
      opacity: 0.6,
    }}>
      v{versionInfo.version} – {versionInfo.commit}
    </footer>
  );
}
