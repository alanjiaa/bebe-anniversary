import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';
import BackNavigation from '../src/components/BackNavigation';

const SpinWheel = () => {
  const [options, setOptions] = useState([]);
  const [newOption, setNewOption] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0 });
  const [showBall, setShowBall] = useState(false);
  const [ballTrail, setBallTrail] = useState([]);
  const [spinningBallPosition, setSpinningBallPosition] = useState({ x: 0, y: 0 });
  const wheelRef = useRef(null);

  const colors = [
    '#F8BBD9', '#F4A6D1', '#F091C9', '#ED7CC1', 
    '#E967B9', '#E552B1', '#E13DA9', '#DD28A1',
    '#D91A99', '#C2188B', '#AB1577', '#941263'
  ];

  const addOption = () => {
    if (newOption.trim() && options.length < 12) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const spinWheel = () => {
    if (isSpinning || options.length < 2) return;
    
    setIsSpinning(true);
    setShowResult(false);
    setResult(null);
    setShowBall(false);
    setBallTrail([]);
    setSpinningBallPosition({ x: 0, y: 0 });
    
    // Calculate random rotation (multiple full rotations + random angle)
    const fullRotations = 5 + Math.random() * 5; // 5-10 full rotations
    const randomAngle = Math.random() * 360;
    const totalRotation = fullRotations * 360 + randomAngle;
    
    setRotation(prev => prev + totalRotation);
    
    // Calculate result after animation
    const anglePerOption = 360 / options.length;
    const normalizedAngle = (360 - (randomAngle % 360)) % 360;
    const resultIndex = Math.floor(normalizedAngle / anglePerOption);
    
    // Calculate ball position for the winning option
    const winningAngle = (360 / options.length) * resultIndex + (360 / options.length) / 2;
    const radians = (winningAngle * Math.PI) / 180;
    const radius = 120; // Distance from center for ball
    const ballX = Math.cos(radians) * radius;
    const ballY = Math.sin(radians) * radius;
    
    // Create trail effect
    const trailPoints = [];
    for (let i = 0; i < 5; i++) {
      const trailRadius = 140 - (i * 4);
      const trailX = Math.cos(radians) * trailRadius;
      const trailY = Math.sin(radians) * trailRadius;
      trailPoints.push({ x: trailX, y: trailY, opacity: 0.3 - (i * 0.05) });
    }
    setBallTrail(trailPoints);
    
    setTimeout(() => {
      setResult(options[resultIndex]);
      setBallPosition({ x: ballX, y: ballY });
      setShowBall(true);
      setIsSpinning(false);
      setShowResult(true);
    }, 3000); // Match animation duration
  };

  const resetWheel = () => {
    setOptions([]);
    setResult(null);
    setShowResult(false);
    setShowBall(false);
    setBallTrail([]);
    setSpinningBallPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  return (
    <>
      <Head>
        <title>Spin the Wheel - Bebe Anniversary</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-100 to-pink-200 flex flex-col">
        <BackNavigation />
        
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4 bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
              Spin the Wheel
            </h1>
            <p className="text-gray-600 text-lg">This will decide what activity we do :D</p>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-8 items-center max-w-6xl w-full">
            {/* Options Panel */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 w-full lg:w-96 shadow-lg border border-pink-200"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Options</h2>
              
              {/* Add Option Input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addOption()}
                  placeholder="Add new option..."
                  className="flex-1 px-4 py-2 bg-white/60 border border-pink-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
                  maxLength={30}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addOption}
                  disabled={!newOption.trim() || options.length >= 12}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </motion.button>
              </div>

              {/* Options List */}
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {options.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🎯</div>
                    <p className="text-sm">Add at least 2 options to start spinning!</p>
                  </div>
                ) : (
                  options.map((option, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between bg-pink-100/60 rounded-lg p-3 border border-pink-200"
                  >
                    <span className="text-gray-800 font-medium">{option}</span>
                    {options.length > 2 && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeOption(index)}
                        className="text-red-400 hover:text-red-300 text-lg font-bold"
                      >
                        ×
                      </motion.button>
                    )}
                  </motion.div>
                  ))
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={spinWheel}
                  disabled={isSpinning || options.length < 2}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSpinning ? 'Spinning...' : 'SPIN THE WHEEL!'}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={resetWheel}
                  className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Reset Options
                </motion.button>
              </div>
            </motion.div>

            {/* Wheel */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative"
            >
              <div className="relative w-80 h-80 lg:w-96 lg:h-96">
                {/* Wheel */}
                <motion.div
                  ref={wheelRef}
                  animate={{ rotate: rotation }}
                  transition={{ 
                    duration: 3, 
                    ease: [0.17, 0.67, 0.12, 0.99] // Custom easing for realistic spin
                  }}
                  className="w-full h-full rounded-full border-8 border-pink-300 shadow-2xl"
                  style={{
                    background: options.length > 0 
                      ? `conic-gradient(${options.map((_, index) => 
                          `${colors[index % colors.length]} 0deg ${(360 / options.length) * (index + 1)}deg`
                        ).join(', ')})`
                      : 'linear-gradient(45deg, #f3f4f6, #e5e7eb)'
                  }}
                >
                  {/* Center Circle */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-pink-300">
                    <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"></div>
                  </div>
                </motion.div>

                {/* Enhanced Pointer */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3 z-10">
                  <div className="relative">
                    {/* Main arrow */}
                    <div className="w-0 h-0 border-l-10 border-r-10 border-b-16 border-l-transparent border-r-transparent border-b-pink-600 drop-shadow-xl"></div>
                    {/* Arrow outline for better visibility */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-11 border-r-11 border-b-17 border-l-transparent border-r-transparent border-b-gray-800 -z-10"></div>
                    {/* Arrow highlight */}
                    <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-12 border-l-transparent border-r-transparent border-b-pink-400"></div>
                  </div>
                </div>

                {/* Option Labels */}
                {options.length > 0 && options.map((option, index) => {
                  const angle = (360 / options.length) * index + (360 / options.length) / 2;
                  const radians = (angle * Math.PI) / 180;
                  const radius = 140; // Distance from center
                  const x = Math.cos(radians) * radius;
                  const y = Math.sin(radians) * radius;
                  
                  return (
                    <div
                      key={index}
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                      style={{
                        transform: `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${angle}deg)`
                      }}
                    >
                      <span className="text-gray-800 font-bold text-sm lg:text-base whitespace-nowrap drop-shadow-sm">
                        {option.length > 12 ? option.substring(0, 12) + '...' : option}
                      </span>
                    </div>
                  );
                })}
                
                {/* Spinning Ball - visible during wheel spin */}
                {isSpinning && options.length > 0 && (
                  <motion.div
                    animate={{ 
                      rotate: rotation // Rotate with the wheel
                    }}
                    transition={{ 
                      duration: 3,
                      ease: [0.17, 0.67, 0.12, 0.99]
                    }}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${rotation}deg) translateY(-150px)`
                    }}
                  >
                    <div className="w-5 h-5 bg-gradient-to-br from-pink-400 to-rose-600 rounded-full shadow-lg border-2 border-white relative">
                      {/* Ball highlight */}
                      <div className="w-1.5 h-1.5 bg-white/80 rounded-full absolute top-0.5 left-0.5"></div>
                      {/* Ball shine */}
                      <div className="w-1 h-1 bg-white/60 rounded-full absolute top-0 left-0"></div>
                    </div>
                  </motion.div>
                )}

                {/* Ball Trail */}
                {showBall && ballTrail.length > 0 && ballTrail.map((trailPoint, index) => (
                  <motion.div
                    key={index}
                    initial={{ 
                      x: 0, 
                      y: -180, 
                      scale: 0.3,
                      opacity: 0
                    }}
                    animate={{ 
                      x: trailPoint.x, 
                      y: trailPoint.y, 
                      scale: 0.3,
                      opacity: trailPoint.opacity
                    }}
                    transition={{ 
                      duration: 0.8,
                      ease: "easeOut",
                      delay: 0.2 + (index * 0.05)
                    }}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
                  >
                    <div className="w-3 h-3 bg-pink-300 rounded-full opacity-50"></div>
                  </motion.div>
                ))}

                {/* Rolling Ball */}
                {showBall && options.length > 0 && (
                  <motion.div
                    initial={{ 
                      x: 0, 
                      y: -180, 
                      scale: 0.5,
                      opacity: 0,
                      rotate: 0
                    }}
                    animate={{ 
                      x: ballPosition.x, 
                      y: ballPosition.y, 
                      scale: 1,
                      opacity: 1,
                      rotate: 720
                    }}
                    transition={{ 
                      duration: 1.2,
                      ease: "easeOut",
                      delay: 0.2,
                      rotate: {
                        duration: 1.2,
                        ease: "easeOut"
                      }
                    }}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
                    style={{
                      transform: `translate(${ballPosition.x}px, ${ballPosition.y}px) translate(-50%, -50%)`
                    }}
                  >
                    <motion.div 
                      className="w-6 h-6 bg-gradient-to-br from-pink-400 to-rose-600 rounded-full shadow-lg border-2 border-white relative"
                      animate={{
                        boxShadow: [
                          "0 4px 8px rgba(0,0,0,0.2)",
                          "0 6px 12px rgba(236, 72, 153, 0.4)",
                          "0 4px 8px rgba(0,0,0,0.2)"
                        ]
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                    >
                      {/* Ball highlight */}
                      <div className="w-2 h-2 bg-white/80 rounded-full absolute top-1 left-1"></div>
                      {/* Ball shine */}
                      <div className="w-1 h-1 bg-white/60 rounded-full absolute top-0.5 left-0.5"></div>
                    </motion.div>
                  </motion.div>
                )}

                {/* Empty state message for wheel */}
                {options.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <div className="text-6xl mb-4">🎡</div>
                      <p className="text-lg font-semibold">Add options to see the wheel!</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Result Modal */}
          <AnimatePresence>
            {showResult && result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={() => setShowResult(false)}
              >
                <motion.div
                  initial={{ y: 50 }}
                  animate={{ y: 0 }}
                  className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-8 mx-4 max-w-md w-full text-center shadow-2xl border border-pink-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="text-6xl mb-4"
                  >
                    🎉
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold text-white mb-2">The wheel has spoken!</h3>
                  <p className="text-3xl font-bold text-yellow-300 mb-6">{result}</p>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowResult(false)}
                    className="px-6 py-3 bg-white/30 text-white rounded-lg font-semibold hover:bg-white/40 transition-colors"
                  >
                    Close
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default SpinWheel;
