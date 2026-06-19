import { useRef, useState, useEffect } from 'react';
import { FaPause, FaPlay, FaVolumeUp, FaChevronDown, FaStepForward, FaStepBackward, FaTrashAlt, FaUpload } from 'react-icons/fa';
import { FiMusic } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const TRACKS = [
  {
    title: 'Super Shy',
    src: '/music/Super Shy - Newjeans (Remix).mp3',
    cover: '/images/polaroids/IMG_0942.webp',
  },
  {
    title: 'WARR',
    src: '/music/dean-warr.mp3',
    cover: '/images/polaroids/IMG_7390.webp',
  },
];
const DEFAULT_COVER = '/images/music/default.jpg';

// Procedural Frutiger Aero Cover Art for Custom Uploaded Tracks
const ProceduralCover = ({ index, size = '100%' }) => {
  const schemes = [
    {
      bg: 'linear-gradient(135deg, #00d2d3 0%, #00a8ff 100%)', // Aqua Aura
      bubbleColor: 'rgba(255, 255, 255, 0.25)',
      accentColor: '#54a0ff'
    },
    {
      bg: 'linear-gradient(135deg, #4cd137 0%, #1dd1a1 100%)', // Green Oasis
      bubbleColor: 'rgba(255, 255, 255, 0.22)',
      accentColor: '#10ac84'
    },
    {
      bg: 'linear-gradient(135deg, #ff9f43 0%, #ff6b6b 100%)', // Orange Sunrise
      bubbleColor: 'rgba(255, 255, 255, 0.25)',
      accentColor: '#ee5253'
    },
    {
      bg: 'linear-gradient(135deg, #0a2540 0%, #0077b6 100%)', // Deep Ocean
      bubbleColor: 'rgba(255, 255, 255, 0.2)',
      accentColor: '#0096c7'
    },
    {
      bg: 'linear-gradient(135deg, #a29bfe 0%, #fd79a8 100%)', // Cosmic Lavender
      bubbleColor: 'rgba(255, 255, 255, 0.3)',
      accentColor: '#e84393'
    }
  ];

  const scheme = schemes[index % schemes.length] || schemes[0];

  return (
    <div style={{
      width: size,
      height: size,
      background: scheme.bg,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'inherit',
      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)',
    }}>
      {/* 3D Orb look overlay */}
      <div style={{
        position: 'absolute',
        width: '80%',
        height: '80%',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 70%)',
        top: '5%',
        left: '5%',
        pointerEvents: 'none',
      }} />

      {/* Decorative vector wave (Frutiger Aero wave) */}
      <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.5 }} viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z" fill="rgba(255,255,255,0.15)" />
        <path d="M0,60 Q30,75 60,55 T100,70 L100,100 L0,100 Z" fill="rgba(255,255,255,0.1)" />
      </svg>

      {/* Embedded 3D-ish bubbles */}
      <div style={{
        position: 'absolute',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: scheme.bubbleColor,
        boxShadow: 'inset 1px 1px 3px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.05)',
        top: '15%',
        right: '15%',
      }} />
      <div style={{
        position: 'absolute',
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        background: scheme.bubbleColor,
        boxShadow: 'inset 1px 1px 3px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.05)',
        bottom: '20%',
        left: '18%',
      }} />

      {/* Central icon */}
      <FiMusic style={{
        fontSize: '2rem',
        color: 'rgba(255, 255, 255, 0.95)',
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))',
        zIndex: 2,
      }} />
    </div>
  );
};

export default function MusicPlayer() {
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const objectUrlsRef = useRef([]);

  const [minimized, setMinimized] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [uploadedTracks, setUploadedTracks] = useState([]);

  // Custom Track Upload Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTrackIdx, setEditingTrackIdx] = useState(null);

  const [db, setDb] = useState(null);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Helper to create and track object URLs to avoid memory leaks
  const createTrackUrl = (blob) => {
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.push(url);
    return url;
  };

  const revokeTrackUrl = (url) => {
    URL.revokeObjectURL(url);
    objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== url);
  };

  // Initialize IndexedDB & Load Custom Tracks
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const request = window.indexedDB.open('FrutigerMusicDB', 1);

    request.onupgradeneeded = (e) => {
      const dbInstance = e.target.result;
      if (!dbInstance.objectStoreNames.contains('tracks')) {
        dbInstance.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (e) => {
      const database = e.target.result;
      setDb(database);

      const transaction = database.transaction('tracks', 'readonly');
      const store = transaction.objectStore('tracks');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const items = getAllRequest.result || [];
        const loaded = items.map((item) => {
          const objectUrl = createTrackUrl(item.fileBlob);
          let coverVal = item.cover;
          if (item.coverBlob) {
            coverVal = createTrackUrl(item.coverBlob);
          }
          return {
            id: item.id,
            title: item.title,
            src: objectUrl,
            cover: coverVal,
            isUserUploaded: true,
          };
        });
        setUploadedTracks(loaded);
        setDbLoaded(true);

        // Once IndexedDB is parsed, load localStorage to restore user's session
        const saved = window.localStorage.getItem('musicPlayer');
        if (saved) {
          try {
            const { minimized: savedMin, volume: savedVol, currentTrack: savedTrack } = JSON.parse(saved);
            setMinimized(savedMin);
            setVolume(savedVol);

            const totalTracksLength = TRACKS.length + loaded.length;
            if (savedTrack >= 0 && savedTrack < totalTracksLength) {
              setCurrentTrack(savedTrack);
            } else {
              setCurrentTrack(0);
            }
          } catch (err) {
            console.error('Failed to parse musicPlayer localStorage state', err);
          }
        }
      };

      getAllRequest.onerror = () => {
        setDbLoaded(true);
      };
    };

    request.onerror = () => {
      setDbLoaded(true);
    };

    // Clean up Object URLs on unmount
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Sync state to localStorage (only after DB is finished loading to avoid race conditions)
  useEffect(() => {
    if (dbLoaded && typeof window !== 'undefined') {
      window.localStorage.setItem(
        'musicPlayer',
        JSON.stringify({ minimized, volume, currentTrack })
      );
    }
  }, [minimized, volume, currentTrack, dbLoaded]);

  // Combine static and custom user tracks
  const allTracks = [...TRACKS, ...uploadedTracks];
  const activeTrack = allTracks[currentTrack] || TRACKS[0];

  // Control playback
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      if (playing && userInteracted) {
        audioRef.current.play().catch(() => {
          setPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [playing, currentTrack, volume, userInteracted, activeTrack?.src]);

  // Update track time & loaded metadata
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => handleNext();

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack, uploadedTracks]);

  const handlePlayPause = () => {
    setUserInteracted(true);
    setPlaying((p) => !p);
  };

  const handleNext = () => {
    setCurrentTrack((prev) => (prev + 1) % allTracks.length);
    setUserInteracted(true);
    setPlaying(true);
  };

  const handlePrev = () => {
    setCurrentTrack((prev) => (prev - 1 + allTracks.length) % allTracks.length);
    setUserInteracted(true);
    setPlaying(true);
  };

  const handleVolume = (e) => setVolume(Number(e.target.value));

  const handleSeek = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    if (audioRef.current && isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Open edit modal on right click
  const handleContextMenu = (idx, e) => {
    const track = allTracks[idx];
    if (!track || !track.isUserUploaded) return;

    e.preventDefault(); // Stop standard browser context menu

    setEditingTrackIdx(idx);
    setUploadTitle(track.title);
    setImagePreview(typeof track.cover === 'string' ? track.cover : null);
    setImageFile(null);
    setAudioFile(null);
    setIsEditMode(true);
    setShowUploadModal(true);
  };

  // Upload MP3 File - Initiates process and opens details modal (Upload Mode)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3')) {
      toast.error('Please select a valid MP3 file.');
      return;
    }

    setAudioFile(file);
    setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    setImageFile(null);
    setImagePreview(null);
    setIsEditMode(false); // Reset to Upload Mode
    setShowUploadModal(true); // Open the details modal!

    // Reset target value to allow re-uploading same file name
    e.target.value = '';
  };

  // Handle custom cover image selection
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG/JPEG/WEBP).');
      return;
    }

    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Save custom track to IndexedDB with optional cover image
  const handleSaveUploadedTrack = () => {
    if (!uploadTitle.trim()) {
      toast.error('Please enter a track title.');
      return;
    }

    if (!audioFile) {
      toast.error('No audio file selected.');
      return;
    }

    if (!db) {
      toast.error('Database connection not ready.');
      return;
    }

    const coverIdx = uploadedTracks.length; // Cycle cover schemes for fallback

    const transaction = db.transaction('tracks', 'readwrite');
    const store = transaction.objectStore('tracks');
    const newTrackRecord = {
      title: uploadTitle.trim(),
      fileBlob: audioFile,
      cover: coverIdx,
      coverBlob: imageFile || null, // Save image file Blob if selected
    };

    const addRequest = store.add(newTrackRecord);

    addRequest.onsuccess = (event) => {
      const newId = event.target.result;
      const audioUrl = createTrackUrl(audioFile);
      
      let coverVal = coverIdx;
      if (imageFile) {
        coverVal = createTrackUrl(imageFile);
      }

      const newTrackObj = {
        id: newId,
        title: uploadTitle.trim(),
        src: audioUrl,
        cover: coverVal,
        isUserUploaded: true,
      };

      setUploadedTracks((prev) => [...prev, newTrackObj]);
      toast.success(`"${uploadTitle.trim()}" added to library!`);
      
      // Switch to the newly uploaded track
      setCurrentTrack(allTracks.length); // Next index will be the new track
      setUserInteracted(true);
      setPlaying(true);
      
      // Close modal
      setShowUploadModal(false);
    };

    addRequest.onerror = () => {
      toast.error('Could not save the track to browser storage.');
    };
  };

  // Save custom track edits to IndexedDB
  const handleSaveEditedTrack = () => {
    if (!uploadTitle.trim()) {
      toast.error('Please enter a track title.');
      return;
    }

    if (editingTrackIdx === null) return;
    const trackToEdit = allTracks[editingTrackIdx];
    if (!trackToEdit || !trackToEdit.isUserUploaded) return;

    if (!db) {
      toast.error('Database connection not ready.');
      return;
    }

    const transaction = db.transaction('tracks', 'readwrite');
    const store = transaction.objectStore('tracks');
    const getRequest = store.get(trackToEdit.id);

    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (!record) {
        toast.error('Track record not found.');
        return;
      }

      record.title = uploadTitle.trim();

      // If user uploaded a new cover image
      if (imageFile) {
        record.coverBlob = imageFile;
      }

      const putRequest = store.put(record);

      putRequest.onsuccess = () => {
        let coverVal = trackToEdit.cover;
        if (imageFile) {
          coverVal = createTrackUrl(imageFile);
          // Revoke old custom cover image if it was a blob URL
          if (typeof trackToEdit.cover === 'string' && trackToEdit.cover.startsWith('blob:')) {
            revokeTrackUrl(trackToEdit.cover);
          }
        }

        const updatedTrackObj = {
          ...trackToEdit,
          title: uploadTitle.trim(),
          cover: coverVal,
        };

        setUploadedTracks((prev) => {
          const uploadedIdx = editingTrackIdx - TRACKS.length;
          const newArr = [...prev];
          newArr[uploadedIdx] = updatedTrackObj;
          return newArr;
        });

        toast.success('Track updated successfully!');
        setShowUploadModal(false);
      };

      putRequest.onerror = () => {
        toast.error('Could not save updates to browser storage.');
      };
    };

    getRequest.onerror = () => {
      toast.error('Could not fetch track record.');
    };
  };

  // Delete uploaded track
  const handleDeleteTrack = (idx, e) => {
    if (e) e.stopPropagation();
    const trackToDelete = allTracks[idx];
    if (!trackToDelete || !trackToDelete.isUserUploaded) return;

    if (!db) return;

    const transaction = db.transaction('tracks', 'readwrite');
    const store = transaction.objectStore('tracks');
    const deleteRequest = store.delete(trackToDelete.id);

    deleteRequest.onsuccess = () => {
      revokeTrackUrl(trackToDelete.src);
      
      // Revoke cover Blob URL if present
      if (typeof trackToDelete.cover === 'string' && trackToDelete.cover.startsWith('blob:')) {
        revokeTrackUrl(trackToDelete.cover);
      }

      setUploadedTracks((prev) => prev.filter((t) => t.id !== trackToDelete.id));
      toast.success(`Removed "${trackToDelete.title}"`);

      // Adjust active track index
      if (currentTrack === idx) {
        const nextActive = Math.max(0, idx - 1);
        setCurrentTrack(nextActive);
        setPlaying(false);
      } else if (currentTrack > idx) {
        setCurrentTrack((prev) => prev - 1);
      }
    };

    deleteRequest.onerror = () => {
      toast.error('Failed to delete track.');
    };
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Helper to render covers inside the carousel
  const renderCover = (track, size = '100%') => {
    if (!track) return null;

    // If cover is a custom uploaded image Blob URL or preloaded image path, render the image
    if (typeof track.cover === 'string') {
      return (
        <img
          src={track.cover}
          alt="cover"
          style={{ width: size, height: size, objectFit: 'cover', borderRadius: 'inherit' }}
          draggable={false}
          onError={(e) => { e.target.src = DEFAULT_COVER; }}
        />
      );
    }

    // If it is user uploaded but has no image Blob (cover is a number index), render procedural art
    if (track.isUserUploaded) {
      return <ProceduralCover index={track.cover} size={size} />;
    }

    // Fallback
    return (
      <img
        src={DEFAULT_COVER}
        alt="cover"
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: 'inherit' }}
        draggable={false}
      />
    );
  };

  // Floating background bubbles component
  const FloatingBubbles = () => {
    const bubbles = [
      { size: 30, left: '8%', delay: '0s', duration: '9s' },
      { size: 16, left: '26%', delay: '1s', duration: '7s' },
      { size: 24, left: '44%', delay: '3s', duration: '11s' },
      { size: 20, left: '62%', delay: '0.5s', duration: '8s' },
      { size: 32, left: '78%', delay: '2s', duration: '10s' },
      { size: 14, left: '92%', delay: '4.5s', duration: '6s' },
    ];
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {bubbles.map((b, i) => (
          <div
            key={i}
            className="floating-bubble"
            style={{
              position: 'absolute',
              bottom: -40,
              left: b.left,
              width: b.size,
              height: b.size,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.1) 60%, rgba(0, 180, 216, 0.15) 100%)',
              boxShadow: 'inset -2px -2px 6px rgba(0,0,0,0.03), inset 2px 2px 6px rgba(255,255,255,0.4), 0 3px 8px rgba(0,180,216,0.08)',
              animation: `float-up ${b.duration} infinite linear`,
              animationDelay: b.delay,
            }}
          />
        ))}
      </div>
    );
  };

  // Carousel item index math
  const getOffset = (idx) => {
    const N = allTracks.length;
    if (N <= 1) return 0;
    let diff = idx - currentTrack;
    while (diff > N / 2) diff -= N;
    while (diff < -N / 2) diff += N;
    return diff;
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <audio ref={audioRef} src={activeTrack?.src} loop />

      {minimized ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {playing && (
            <div
              className="minimized-pill"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 104, 186, 0.95) 0%, rgba(0, 163, 163, 0.9) 100%)',
                backdropFilter: 'blur(12px) saturate(160%)',
                border: '1.5px solid rgba(255, 255, 255, 0.65)',
                boxShadow: '0 8px 24px rgba(0, 70, 120, 0.35), inset 0 1px 2.5px rgba(255, 255, 255, 0.6)',
                color: '#fff',
                borderRadius: 9999,
                padding: '8px 20px',
                fontWeight: 600,
                fontSize: 14,
                position: 'relative',
                minWidth: 120,
                maxWidth: 180,
                overflow: 'hidden',
                height: 38,
                display: 'flex',
                alignItems: 'center',
                marginRight: 4,
              }}
            >
              <div style={{ width: 140, overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative' }}>
                <span style={{ display: 'inline-block', paddingLeft: '100%', animation: 'marquee-pill 8s linear infinite' }}>
                  {activeTrack.title}
                </span>
              </div>
            </div>
          )}
          <button
            aria-label="Open music player"
            onClick={() => setMinimized(false)}
            className="pulse-glow-active"
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #00b4d8 0%, #0077b6 60%, #003049 100%)',
              boxShadow: '0 8px 25px rgba(0, 168, 255, 0.45), inset 0 4px 8px rgba(255, 255, 255, 0.65)',
              border: '2px solid rgba(255, 255, 255, 0.85)',
              color: '#fff',
              fontSize: 24,
              cursor: 'pointer',
              transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {/* Gloss reflection bubble cap */}
            <div style={{
              position: 'absolute',
              top: 2,
              left: '15%',
              right: '15%',
              height: '35%',
              background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 100%)',
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: 3,
            }} />
            {activeTrack && typeof activeTrack.cover === 'string' ? (
              <img
                src={activeTrack.cover}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', zIndex: 1 }}
                draggable={false}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <FiMusic style={{ strokeWidth: 2, zIndex: 2, position: 'relative', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
            )}
          </button>
        </div>
      ) : (
        /* Expanded Frutiger Aero Player */
        <div
          style={{
            width: 330,
            background: 'linear-gradient(135deg, rgba(8, 115, 117, 0.6) 0%, rgba(0, 104, 186, 0.55) 60%, rgba(3, 130, 140, 0.55) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            border: '1.5px solid rgba(255, 255, 255, 0.55)',
            borderRadius: 30,
            boxShadow: '0 20px 50px rgba(0, 50, 120, 0.4), inset 0 2px 6px rgba(255, 255, 255, 0.6), inset 0 -2px 6px rgba(0,0,0,0.1)',
            padding: '24px 20px 20px 20px',
            color: '#fff',
            fontFamily: 'Poppins, Arial, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Custom Track Upload Modal Overlay */}
          {showUploadModal && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(8, 60, 90, 0.96) 0%, rgba(5, 75, 105, 0.96) 100%)',
              zIndex: 100,
              padding: '20px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              color: '#fff',
              borderRadius: 'inherit',
              backdropFilter: 'blur(15px)',
              border: '1.5px solid rgba(255,255,255,0.3)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FaUpload style={{ color: '#00d2d3', fontSize: 12 }} /> {isEditMode ? 'Edit Track Details' : 'Add Custom Track'}
                </h3>

                {/* Title Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 11, opacity: 0.85, fontWeight: 500 }}>Track Title</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Enter track title"
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.35)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: 13,
                      outline: 'none',
                      fontFamily: 'Poppins, sans-serif',
                    }}
                  />
                </div>

                {/* Image Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 11, opacity: 0.85, fontWeight: 500 }}>Cover Image (Optional)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 58,
                      height: 58,
                      borderRadius: 10,
                      border: '1.5px dashed rgba(255,255,255,0.4)',
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {imagePreview ? (
                        <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <FiMusic style={{ opacity: 0.4, fontSize: 18 }} />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => document.getElementById('cover-image-input').click()}
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.35)',
                        color: '#fff',
                        padding: '6px 14px',
                        borderRadius: 15,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    >
                      Browse Cover
                    </button>
                    <input
                      id="cover-image-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                <button
                  onClick={isEditMode ? handleSaveEditedTrack : handleSaveUploadedTrack}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(to bottom, #00d2d3 0%, #00a8ff 100%)',
                    border: '1px solid rgba(255,255,255,0.7)',
                    color: '#fff',
                    padding: '8px 0',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0, 168, 255, 0.3)',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  {isEditMode ? 'Save Changes' : 'Save Track'}
                </button>
                
                <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                  {isEditMode && (
                    <button
                      onClick={(e) => {
                        handleDeleteTrack(editingTrackIdx, e);
                        setShowUploadModal(false);
                      }}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(to bottom, #ff6b6b 0%, #ee5253 100%)',
                        border: '1px solid rgba(255,255,255,0.7)',
                        color: '#fff',
                        padding: '8px 0',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(238, 82, 83, 0.3)',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      Delete Track
                    </button>
                  )}
                  <button
                    onClick={() => setShowUploadModal(false)}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#fff',
                      padding: '8px 0',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Glass Glossy Top Overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '45%',
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0) 50.5%)',
            pointerEvents: 'none',
            zIndex: 1,
          }} />

          {/* Animated Sheen sweep */}
          <div className="glossy-sweep" />

          {/* Floating Bubble Background */}
          <FloatingBubbles />

          {/* Minimize button */}
          <button
            aria-label="Minimize music player"
            onClick={() => setMinimized(true)}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '50%',
              width: 28,
              height: 28,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.35)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          >
            <FaChevronDown style={{ fontSize: 12 }} />
          </button>

          {/* Player Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, zIndex: 5, width: '100%', justifyContent: 'flex-start' }}>
            <FiMusic style={{ color: '#00d2d3', filter: 'drop-shadow(0 0 4px rgba(0,210,210,0.4))' }} />
          </div>

          {/* 3D Cards Carousel */}
          <div style={{
            perspective: '1000px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            height: 160,
            width: '100%',
            overflow: 'hidden',
            marginBottom: 8,
            userSelect: 'none',
            zIndex: 5,
          }}>
            {allTracks.map((track, idx) => {
              const offset = getOffset(idx);
              const absOffset = Math.abs(offset);

              // Only render items close to viewport to optimize performance
              if (absOffset > 2) return null;

              let transformStr = '';
              let zIndex = 1;
              let opacity = 0;
              let pointerEvents = 'none';

              if (offset === 0) {
                transformStr = 'translateX(0) translateZ(80px) rotateY(0deg) scale(1.05)';
                zIndex = 10;
                opacity = 1;
                pointerEvents = 'auto';
              } else if (offset === 1) {
                transformStr = 'translateX(100px) translateZ(0px) rotateY(-35deg) scale(0.85)';
                zIndex = 5;
                opacity = 0.8;
                pointerEvents = 'auto';
              } else if (offset === -1) {
                transformStr = 'translateX(-100px) translateZ(0px) rotateY(35deg) scale(0.85)';
                zIndex = 5;
                opacity = 0.8;
                pointerEvents = 'auto';
              } else if (offset === 2) {
                transformStr = 'translateX(175px) translateZ(-80px) rotateY(-50deg) scale(0.65)';
                zIndex = 2;
                opacity = 0.25;
                pointerEvents = 'none';
              } else if (offset === -2) {
                transformStr = 'translateX(-175px) translateZ(-80px) rotateY(50deg) scale(0.65)';
                zIndex = 2;
                opacity = 0.25;
                pointerEvents = 'none';
              }

              return (
                <div
                  key={track.id || track.src}
                  onClick={() => pointerEvents === 'auto' && (offset === 0 ? handlePlayPause() : (setCurrentTrack(idx), setUserInteracted(true), setPlaying(true)))}
                  onContextMenu={(e) => handleContextMenu(idx, e)}
                  style={{
                    position: 'absolute',
                    width: 125,
                    height: 125,
                    borderRadius: 18,
                    border: '2px solid rgba(255, 255, 255, 0.7)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.18), inset 0 1px 2px rgba(255,255,255,0.4)',
                    background: 'rgba(255,255,255,0.1)',
                    transform: transformStr,
                    zIndex: zIndex,
                    opacity: opacity,
                    pointerEvents: pointerEvents,
                    transition: 'transform 0.45s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.45s, z-index 0.45s',
                    cursor: 'pointer',
                    overflow: 'visible',
                  }}
                >
                  {/* Gloss overlay */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'inherit',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 50%)',
                    zIndex: 3,
                    pointerEvents: 'none',
                  }} />

                  {renderCover(track, '100%')}

                  {/* Play Indicator on Active Card */}
                  {offset === 0 && playing && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 'inherit',
                      border: '2.5px solid #00d2d3',
                      boxShadow: '0 0 12px rgba(0, 210, 210, 0.6)',
                      pointerEvents: 'none',
                      animation: 'pulse-glow 1.5s infinite ease-in-out',
                      zIndex: 4,
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Active Track Title Display */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12, width: '100%', zIndex: 5 }}>
            <div style={{
              fontWeight: 600,
              fontSize: 16,
              color: '#fff',
              textShadow: '0 2px 4px rgba(0, 119, 182, 0.3)',
              textAlign: 'center',
              maxWidth: '240px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {activeTrack.title}
            </div>
            <div style={{ fontSize: 11, opacity: 0.7, textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
              {activeTrack.isUserUploaded ? 'Custom Track' : 'Official Track'}
            </div>
          </div>

          {/* Seek Progress Bar */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8, zIndex: 5 }}>
            <div
              onClick={handleSeek}
              style={{
                width: '100%',
                height: 8,
                background: 'rgba(255, 255, 255, 0.22)',
                borderRadius: 9999,
                position: 'relative',
                cursor: 'pointer',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)',
                overflow: 'hidden',
              }}
            >
              <div style={{
                width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #00d2d3 0%, #00a8ff 100%)',
                borderRadius: 'inherit',
                boxShadow: '0 0 8px rgba(0, 168, 255, 0.7)',
                position: 'relative',
                transition: 'width 0.1s linear',
              }}>
                {/* Internal liquid highlight */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '40%',
                  background: 'rgba(255, 255, 255, 0.35)',
                  borderTopLeftRadius: 'inherit',
                  borderTopRightRadius: 'inherit',
                }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.85, fontFamily: 'monospace' }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Audio Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, zIndex: 5 }}>
            <button
              aria-label="Previous"
              onClick={handlePrev}
              className="frutiger-btn"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 13,
                border: '1px solid rgba(255,255,255,0.85)',
                color: '#0077b6',
                background: 'linear-gradient(to bottom, #ffffff 0%, #e0f2fe 100%)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1), inset 0 1.5px 3px rgba(255,255,255,0.8)',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
            >
              <FaStepBackward />
            </button>

            <button
              aria-label={playing ? 'Pause' : 'Play'}
              onClick={handlePlayPause}
              className="frutiger-btn-play"
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 18,
                border: '1px solid rgba(255,255,255,0.95)',
                color: '#ffffff',
                background: 'linear-gradient(to bottom, #00d2d3 0%, #00a8ff 100%)',
                boxShadow: '0 4px 15px rgba(0, 168, 255, 0.45), inset 0 2px 4px rgba(255,255,255,0.6)',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
            >
              {playing ? <FaPause /> : <FaPlay style={{ marginLeft: playing ? 0 : 3 }} />}
            </button>

            <button
              aria-label="Next"
              onClick={handleNext}
              className="frutiger-btn"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 13,
                border: '1px solid rgba(255,255,255,0.85)',
                color: '#0077b6',
                background: 'linear-gradient(to bottom, #ffffff 0%, #e0f2fe 100%)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1), inset 0 1.5px 3px rgba(255,255,255,0.8)',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
            >
              <FaStepForward />
            </button>
          </div>

          {/* Volume Control Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'center', zIndex: 5, marginBottom: 12 }}>
            <FaVolumeUp style={{ opacity: 0.85, fontSize: 13 }} />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolume}
              style={{
                WebkitAppearance: 'none',
                width: '80px',
                height: '6px',
                background: 'rgba(255,255,255,0.3)',
                borderRadius: '3px',
                outline: 'none',
                cursor: 'pointer',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
              }}
              className="volume-slider"
            />
          </div>

          {/* Bottom actions: Track count & Add MP3 */}
          <div style={{
            display: 'flex',
            width: '100%',
            flexDirection: 'column',
            gap: 5,
            marginTop: 6,
            borderTop: '1px solid rgba(255,255,255,0.15)',
            paddingTop: 12,
            zIndex: 5
          }}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, opacity: 0.8, fontWeight: 500 }}>Library: {allTracks.length} tracks</span>

              <button
                onClick={handleUploadClick}
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 100%)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0, 119, 182, 0.1)',
                  backdropFilter: 'blur(4px)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.48)';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(255,255,255,0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 100%)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 119, 182, 0.1)';
                }}
              >
                <FaUpload style={{ fontSize: 10 }} /> Upload MP3
              </button>
            </div>
            {uploadedTracks.length > 0 && (
              <span style={{ fontSize: 9, opacity: 0.6, alignSelf: 'center', fontStyle: 'italic', marginTop: 2 }}>
                * Right-click custom track to edit or delete
              </span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3, audio/mpeg"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Frutiger Aero global stylesheet overrides */}
      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) rotate(0deg) scale(0.6);
            opacity: 0;
          }
          15% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-240px) rotate(360deg) scale(1.25);
            opacity: 0;
          }
        }
        @keyframes gloss-sweep {
          0% {
            transform: translateX(-150%) skewX(-30deg);
          }
          100% {
            transform: translateX(250%) skewX(-30deg);
          }
        }
        .glossy-sweep {
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%);
          transform: skewX(-30deg);
          animation: gloss-sweep 7s infinite ease-in-out;
          pointer-events: none;
          z-index: 2;
        }
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 12px rgba(0, 210, 210, 0.5), inset 0 2px 4px rgba(255,255,255,0.5);
          }
          50% {
            box-shadow: 0 0 24px rgba(0, 210, 210, 0.9), inset 0 2px 4px rgba(255,255,255,0.7);
          }
        }
        .pulse-glow-active {
          animation: pulse-glow 2.5s infinite ease-in-out;
        }
        @keyframes marquee-pill {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .frutiger-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 0 12px rgba(0, 168, 255, 0.6), inset 0 1.5px 3px rgba(255,255,255,0.95) !important;
          background: linear-gradient(to bottom, #ffffff 0%, #bae6fd 100%) !important;
        }
        .frutiger-btn:active {
          transform: scale(0.95);
        }
        .frutiger-btn-play:hover {
          transform: scale(1.1);
          box-shadow: 0 0 20px rgba(0, 168, 255, 0.8), inset 0 2px 4px rgba(255,255,255,0.8) !important;
          filter: brightness(1.06);
        }
        .frutiger-btn-play:active {
          transform: scale(0.95);
        }
        
        /* Custom styled volume slider thumb for Webkit & Mozilla */
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ffffff 0%, #e0e0e0 60%, #a0a0a0 100%);
          border: 1px solid rgba(0, 0, 0, 0.25);
          box-shadow: 0 1px 3px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.85);
          cursor: pointer;
          transition: transform 0.1s;
        }
        .volume-slider::-webkit-slider-thumb:hover {
          transform: scale(1.25);
        }
        .volume-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ffffff 0%, #e0e0e0 60%, #a0a0a0 100%);
          border: 1px solid rgba(0, 0, 0, 0.25);
          box-shadow: 0 1px 3px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.85);
          cursor: pointer;
          transition: transform 0.1s;
        }
        .volume-slider::-moz-range-thumb:hover {
          transform: scale(1.25);
        }
      `}</style>
    </div>
  );
}
