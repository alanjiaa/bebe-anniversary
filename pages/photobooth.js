import { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import BackNavigation from '@/components/BackNavigation';

const LAYOUTS = [
  { key: 'vertical', label: '4-Vertical Strip' },
  { key: 'big', label: '1 Big Photo' },
];

export default function Photobooth() {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [timer, setTimer] = useState(3);
  const [photos, setPhotos] = useState([]);
  const [layout, setLayout] = useState('vertical');
  const [printing, setPrinting] = useState(false);
  const [printed, setPrinted] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const borderRef = useRef(null);
  const [flash, setFlash] = useState(false);

  // Sound refs
  const beepRef = useRef(null);
  const shutterRef = useRef(null);
  const printRef = useRef(null);

  // Set video stream when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Play beep sound for timer
  useEffect(() => {
    if (capturing && timer > 0 && beepRef.current) {
      beepRef.current.currentTime = 0;
      beepRef.current.play();
    }
  }, [timer, capturing]);

  // Start webcam
  const startCamera = async () => {
    setError('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
    } catch (err) {
      setError('Could not access camera.');
    }
  };

  // Take a photo with timer
  const takePhoto = async () => {
    setCapturing(true);
    let t = 3;
    setTimer(t);
    const countdown = setInterval(() => {
      t--;
      setTimer(t);
      if (t === 0) {
        clearInterval(countdown);
        setTimeout(() => {
          capture();
        }, 200); // slight delay for flash
      }
    }, 1000);
  };

  // Capture image from video
  const capture = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    if (shutterRef.current) {
      shutterRef.current.currentTime = 0;
      shutterRef.current.play();
    }
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhotos((prev) => [...prev, canvas.toDataURL('image/png')]);
    setCapturing(false);
    setTimer(3);
  };

  // Print animation and download
  const handlePrint = async () => {
    setPrinting(true);
    if (printRef.current) {
      printRef.current.currentTime = 0;
      printRef.current.play();
    }
    setTimeout(async () => {
      if (borderRef.current) {
        // Use the wrapper for correct aspect ratio
        const wrapper = borderRef.current.parentElement;
        const canvas = await html2canvas(wrapper, {backgroundColor: null, scale: 2, useCORS: true, width: wrapper.offsetWidth, height: wrapper.offsetHeight});
        setDownloadUrl(canvas.toDataURL('image/png'));
      }
      setPrinting(false);
      setPrinted(true);
    }, 1800);
  };

  // Reset photobooth
  const reset = () => {
    setPhotos([]);
    setDownloadUrl('');
    setPrinted(false);
  };

  // Layout rendering
  const renderLayout = () => {
    if (layout === 'vertical') {
      return (
        <div
          ref={borderRef}
          className="bg-white border-8 border-rose-pink rounded-3xl p-3 flex flex-col items-center gap-2 shadow-2xl w-[180px] min-h-[600px] relative"
          style={{ fontFamily: 'Poppins, Arial, Helvetica, sans-serif' }}
        >
          <div className="font-bold text-rose-pink text-lg mb-1">Bebe Photobooth</div>
          {photos.slice(0, 4).map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`photo-${i}`}
              className="w-[140px] h-[140px] object-cover rounded-xl border-2 border-soft-lavender"
            />
          ))}
        </div>
      );
    } else {
      return (
        <div
          ref={borderRef}
          className="bg-white border-8 border-rose-pink rounded-3xl p-3 flex flex-col items-center gap-2 shadow-2xl w-[320px] min-h-[320px] relative"
          style={{ fontFamily: 'Poppins, Arial, Helvetica, sans-serif' }}
        >
          <div className="font-bold text-rose-pink text-lg mb-1">Bebe Photobooth</div>
          {photos[0] && (
            <img
              src={photos[0]}
              alt="big-photo"
              className="w-[280px] h-[280px] object-cover rounded-2xl border-2 border-soft-lavender"
            />
          )}
        </div>
      );
    }
  };

  // Animated print-out strip
  const renderPrintAnimation = () => {
    if (!printing) return null;
    return (
      <div className="fixed left-1/2 top-1/2 z-[10000] flex flex-col items-center" style={{transform: 'translate(-50%, -50%)'}}>
        {/* Photobooth machine */}
        <div className="bg-gray-200 rounded-t-3xl rounded-b-lg w-56 h-40 flex flex-col items-center shadow-2xl relative border-4 border-rose-pink">
          <div className="absolute left-1/2 top-20 w-24 h-6 bg-black rounded-b-2xl" style={{transform: 'translateX(-50%)'}} />
          {/* Dispenser slot */}
          <div className="absolute left-1/2 top-24 w-20 h-4 bg-gray-700 rounded-b-xl" style={{transform: 'translateX(-50%)'}} />
          {/* Print-out strip (animated) */}
          <div className={`absolute left-1/2 w-[180px]`} style={{
            top: '104px',
            transform: 'translateX(-50%)',
            animation: 'slide-print 1.8s cubic-bezier(.4,2,.6,1)'
          }}>
            {renderLayout()}
          </div>
        </div>
        <style>{`
          @keyframes slide-print {
            0% { transform: translateX(-50%) translateY(-120px); opacity: 0; }
            20% { opacity: 1; }
            100% { transform: translateX(-50%) translateY(120px); opacity: 1; }
          }
        `}</style>
      </div>
    );
  };

  // Cute photobooth machine UI
  const renderPhotoboothMachine = () => (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="relative flex flex-col items-center">
        {/* Booth top sign */}
        <div className="bg-rose-pink text-white font-bold text-xl px-8 py-2 rounded-t-2xl shadow mb-1" style={{ letterSpacing: 2 }}>PHOTOBOOTH</div>
        {/* Booth body */}
        <div className="bg-gray-100 border-4 border-rose-pink rounded-b-3xl shadow-2xl flex flex-col items-center pb-8 pt-4 px-6 relative" style={{ minWidth: 370 }}>
          {/* Camera screen */}
          <div className="bg-black rounded-xl border-4 border-soft-lavender flex items-center justify-center mb-4 relative" style={{ width: 320, height: 240 }}>
            {stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                width={320}
                height={240}
                className="rounded-lg"
                style={{ background: '#222' }}
              />
            ) : (
              <div className="text-white text-lg">Camera Off</div>
            )}
            {capturing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/80 text-rose-pink text-4xl font-bold rounded-full px-8 py-4 animate-bounce shadow-lg border-4 border-rose-pink">
                  {timer > 0 ? timer : '📸'}
                </div>
              </div>
            )}
          </div>
          {/* Controls */}
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="flex gap-2 mb-2">
              {LAYOUTS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setLayout(l.key)}
                  className={`px-4 py-2 rounded-full font-semibold transition ${layout === l.key ? 'bg-rose-pink text-white' : 'bg-soft-lavender text-rose-pink'}`}
                  style={{ fontFamily: 'Poppins' }}
                  disabled={printing || printed}
                >
                  {l.label}
                </button>
              ))}
            </div>
            {!stream ? (
              <button
                onClick={startCamera}
                className="bg-rose-pink text-white px-6 py-3 rounded-full font-bold mb-2"
                style={{ fontFamily: 'Poppins' }}
                disabled={printing || printed}
              >
                Start Camera
              </button>
            ) : null}
            {error && <div className="text-red-500 mb-2">{error}</div>}
            {stream && !printing && !printed && (
              <div className="flex gap-2">
                {layout === 'vertical' && photos.length < 4 && !capturing && (
                  <button
                    onClick={takePhoto}
                    className="bg-soft-lavender text-white px-6 py-2 rounded-full font-bold"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    Take Photo {photos.length + 1}/4
                  </button>
                )}
                {layout === 'big' && photos.length < 1 && !capturing && (
                  <button
                    onClick={takePhoto}
                    className="bg-soft-lavender text-white px-6 py-2 rounded-full font-bold"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    Take Photo
                  </button>
                )}
                {(photos.length > 0 && !capturing) && (
                  <button
                    onClick={reset}
                    className="bg-gray-200 text-rose-pink px-6 py-2 rounded-full font-bold"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    Reset
                  </button>
                )}
              </div>
            )}
            {/* Print button only after all photos taken, before print */}
            {((layout === 'vertical' && photos.length === 4) || (layout === 'big' && photos.length === 1)) && !printing && !printed && (
              <button
                onClick={handlePrint}
                className="mt-4 bg-rose-pink text-white px-8 py-3 rounded-full font-bold text-lg"
                style={{ fontFamily: 'Poppins' }}
                disabled={printing}
              >
                Print & Download
              </button>
            )}
            {/* Download button only after print */}
            {printed && downloadUrl && (
              <a
                href={downloadUrl}
                download="bebe-photobooth.png"
                className="mt-4 bg-soft-lavender text-white px-6 py-2 rounded-full font-bold"
                style={{ fontFamily: 'Poppins' }}
              >
                Download Photo
              </a>
            )}
          </div>
        </div>
        {/* Booth feet */}
        <div className="flex gap-4 mt-2">
          <div className="w-8 h-6 bg-gray-300 rounded-b-xl border-2 border-rose-pink" />
          <div className="w-8 h-6 bg-gray-300 rounded-b-xl border-2 border-rose-pink" />
        </div>
      </div>
      {/* Cute decorations */}
      <div className="mt-4 flex gap-2">
        <span className="text-rose-pink text-2xl">💕</span>
        <span className="text-soft-lavender text-2xl">🎀</span>
        <span className="text-rose-pink text-2xl">✨</span>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cream p-8"
      style={{ fontFamily: 'Poppins, Arial, Helvetica, sans-serif', position: 'relative' }}
    >
      {/* Sound effects */}
      <audio ref={beepRef} src="/sounds/beep.mp3" preload="auto" />
      <audio ref={shutterRef} src="/sounds/shutter.mp3" preload="auto" />
      <audio ref={printRef} src="/sounds/print.mp3" preload="auto" />
      {/* Flash overlay */}
      {flash && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(255,255,255,0.85)',
          zIndex: 9999,
          pointerEvents: 'none',
          transition: 'opacity 0.2s',
        }} />
      )}
      {renderPrintAnimation()}
      <h1 className="text-4xl font-bold mb-4 text-rose-pink" style={{ fontFamily: 'Poppins' }}>Cute Photobooth</h1>
      {renderPhotoboothMachine()}
      
      {/* Back Navigation */}
      <BackNavigation 
        href="/home" 
        text="← Back to Home" 
        className="bg-rose-pink hover:bg-rose-pink/90 text-white font-semibold px-6 py-3 rounded-2xl transition"
        showHomeButton={false}
      />
    </div>
  );
} 