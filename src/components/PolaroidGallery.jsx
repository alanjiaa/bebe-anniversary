// src/components/PolaroidGallery.jsx
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/router'
import PolaroidCard from './PolaroidCard'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

const galleries = [
  {
    id: 1,
    main: { image: '/images/polaroids/image6.jpg', caption: 'Tian Tian Adventures' },
    stack: [
      {
        image: '/images/polaroids/image6.jpg',
        caption: 'Our most visited spot!',
        details: 'i look forward to many more bbt and snack runs 17/07/2024',
      },
      {
        image: '/images/polaroids/image1.jpg',
        caption: 'Cheeky 0.5 pic',
        details: 'waiting for our bbt LOL 04/07/2024',
      },
      {
        image: '/images/polaroids/image16.jpg',
        caption: 'Iconic bebe pose',
        details: 'flex YAYAYA. Mankyu for making tiantian a special place for us 31/07/2024',
      }
    ],
  },
  {
    id: 2,
    main: { image: '/images/polaroids/IMG_1534.webp', caption: 'London Outings' },
    stack: [
      {
        image: '/images/polaroids/IMG_1534.webp',
        caption: 'Sunny Day',
        details: 'Picked up my passport today, and watched Trap in cinema yeyeye',
      },
      {
        image: '/images/polaroids/IMG_0816.webp',
        caption: 'Yamaha Store yeehaw',
        details: 'My bebe looks majestic as always <3',
      },
      {
        image: '/images/polaroids/IMG_1523.webp',
        caption: 'Sunny pt2',
        details: 'She a model she a MICHELLIN',
      },
    ],
  },
  {
    id: 3,
    main: { image: '/images/polaroids/IMG_0631.webp', caption: 'Homey Vibes' },
    stack: [
      {
        image: '/images/polaroids/IMG_0631.webp',
        caption: 'House Wifey Activities',
        details: 'DAYMMM she handling that dyson',
      },
      {
        image: '/images/polaroids/IMG_1768.webp',
        caption: 'Late-night Blueberry Muffins',
        details: 'I love baking with you bebe! Lets BAKE COOKIES!',
      },
      {
        image: '/images/polaroids/IMG_0942.webp',
        caption: 'Hands up for gf of the year',
        details: 'WHY IS PG UNDER HOSTAGE',
      },
      {
        image: '/images/polaroids/IMG_1874.webp',
        caption: 'MY SHAYLA is so cute🥲',
        details: 'Do you remember this water game LOOOL',
      },
      {
        image: '/images/polaroids/IMG_5809.webp',
        caption: 'Girl Go GAMES',
        details: 'Game sesh aw yeee',
      },
    ],
  },
  {
    id: 4,
    main: { image: '/images/polaroids/IMG_1099.webp', caption: '0.5 compilation' },
    stack: [
      {
        image: '/images/polaroids/IMG_1099.webp',
        caption: 'Big eyes bebe',
        details: '',
      },
      {
        image: '/images/polaroids/IMG_1129.webp',
        caption: 'OUTDOOR EDITION',
        details: 'trekking and stepping',
      },
      {
        image: '/images/polaroids/IMG_1510.webp',
        caption: 'Sunny pt3',
        details: 'twinnem',
      },
      {
        image: '/images/polaroids/IMG_6210.webp',
        caption: 'Picking bebe up',
        details: 'Happy days <3',
      },
      {
        image: '/images/polaroids/IMG_7068.webp',
        caption: 'Bebe in natural habitat',
        details: 'Home toime',
      },
    ],
  },
  {
    id: 5,
    main: { image: '/images/polaroids/IMG_5624.webp', caption: 'Double Date w/ Big Backs' },
    stack: [
      {
        image: '/images/polaroids/IMG_7310.webp',
        caption: 'BRUNCH BRUNCH',
        details: 'This was so yummyyy',
      },
      {
        image: '/images/polaroids/IMG_0963.webp',
        caption: 'Flower Gurl',
        details: 'CUMIN',
      },
      {
        image: '/images/polaroids/IMG_0990.webp',
        caption: 'SHREK FACE LOOL',
        details: 'i love these pics',
      },
    ],
  },
  {
    id: 6,
    main: { image: '/images/polaroids/IMG_3167.webp', caption: 'Reunite 2025' },
    stack: [
      {
        image: '/images/polaroids/IMG_3167.webp',
        caption: 'Always happy with bebe',
        details: 'Thank you for always being by my side bebe i love you',
      },
      {
        image: '/images/polaroids/IMG_3487.webp',
        caption: 'Pretty Flowers, Pretty Princess',
        details: '',
      },
      {
        image: '/images/polaroids/IMG_7393.webp',
        caption: 'My Absolutely Stunning bebe',
        details: 'I am so lucky to have you. We look like kids LOL',
      },
      {
        image: '/images/polaroids/IMG_7396.webp',
        caption: 'Side angle on fleek',
        details: '',
      },
      {
        image: '/images/polaroids/IMG_7413.webp',
        caption: 'She a model model',
        details: '',
      },
      {
        image: '/images/polaroids/IMG_7390.webp',
        caption: 'CHOMPP',
        details: 'AYO LEMME BITE THAT ARM',
      },
      {
        image: '/images/polaroids/IMG_7234.webp',
        caption: 'Sunny pt4',
        details: 'Walks with you are the best walks. 📍 Mudchute Farm',
      },
    ],
  },
  {
    id: 7,
    main: { image: '/images/polaroids/IMG_7176.webp', caption: 'Reunite 2025 pt2' },
    stack: [
      {
        image: '/images/polaroids/IMG_7176.webp',
        caption: 'Bebe looking like a cute schnack',
        details: 'Get that balencia bag, that bag',
      },
      {
        image: '/images/polaroids/IMG_7186.webp',
        caption: 'shades on, swag on',
        details: '',
      },
      {
        image: '/images/polaroids/IMG_7166.webp',
        caption: 'DSM MIRROR SELFIE',
        details: 'Just a bunch of fashionistas',
      },
      {
        image: '/images/polaroids/IMG_7616.webp',
        caption: 'Cherry Blossoms',
        details: 'Loved this day so much',
      },
      {
        image: '/images/polaroids/IMG_7490.webp',
        caption: 'Wingstop HEHE',
        details: 'BIG BACKIN ALL DAY EVERYDAY',
      },
      {
        image: '/images/polaroids/IMG_7679.webp',
        caption: 'Vaccum Pickup',
        details: 'Even cleaning is fun with you bebe',
      },
      {
        image: '/images/polaroids/IMG_7215.webp',
        caption: 'PJ and otw to play Charades',
        details: 'Cant wait to play more charades yayy',
      },
      {
        image: '/images/polaroids/IMG_3508.webp',
        caption: 'bebe and doge',
        details: 'We will have a dog of our own one day',
      },
      {
        image: '/images/polaroids/IMG_3751.webp',
        caption: 'You look like a baebi here',
        details: '🥹🥹🥹🥹🥹',
      },
      {
        image: '/images/polaroids/IMG_3718.webp',
        caption: 'Looking forward to our future adventures',
        details: 'I love you so much bebe',
      },
    ],
  }

]

export default function PolaroidGallery() {
  const [stackImages, setStackImages] = useState(null)
  const [stackIndex, setStackIndex]   = useState(0)
  const router = useRouter()

  const openGallery = useCallback((stack) => {
    setStackImages(stack)
    setStackIndex(0)
  }, [])

  const closeGallery = useCallback(() => {
    setStackImages(null)
  }, [])

  const nextImage = useCallback(() => {
    setStackIndex((i) => (i + 1 < stackImages.length ? i + 1 : i))
  }, [stackImages])

  const prevImage = useCallback(() => {
    setStackIndex((i) => (i > 0 ? i - 1 : i))
  }, [])

  // handle keyboard when modal is open
  useEffect(() => {
    if (!stackImages) return

    const onKey = (e) => {
      if (e.key === 'ArrowRight') nextImage()
      else if (e.key === 'ArrowLeft') prevImage()
      else if (e.key === 'Escape') closeGallery()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stackImages, nextImage, prevImage, closeGallery])

  return (
    <div className="min-h-screen p-8 bg-cream">
      <h1 className="text-4xl font-script text-center text-rose-pink mb-8">
        Our Memories 💖
      </h1>

      {/* Gallery grid */}
      <div className="flex flex-wrap gap-8 justify-center mb-8">
        {galleries.map((gallery) => (
          <PolaroidCard
            key={gallery.id}
            image={gallery.main.image}
            caption={gallery.main.caption}
            onClick={() => openGallery(gallery.stack)}
          />
        ))}
      </div>

      {/* Back to Menu button */}
      <div className="text-center mb-8">
        <button
          onClick={() => router.push('/home')}
          className="bg-soft-lavender hover:bg-soft-lavender/90 text-white font-semibold
                     px-6 py-3 rounded-2xl text-lg transition"
        >
          Back to Menu
        </button>
      </div>

      {/* Modal carousel */}
      <AnimatePresence>
        {stackImages && stackIndex < stackImages.length && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Hint */}
            <div className="text-white mb-4 text-sm">
              Use ← → to navigate, Esc to close
            </div>

            <div className="relative w-[300px] h-[380px]">
              {stackImages.slice(stackIndex).map((img, idx) => {
                const offset = idx * 8
                const rotate = (idx % 2 ? -1 : 1) * idx * 2
                return (
                  <motion.div
                    key={img.image}
                    style={{ top: offset, left: offset, zIndex: stackImages.length - idx }}
                    className="absolute bg-white border-4 border-white rounded-xl shadow-2xl overflow-hidden cursor-pointer"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, rotate }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    onClick={nextImage}
                  >
                    <div className="relative w-[300px] h-[300px]">
                      <Image
                        src={img.image}
                        alt={img.caption}
                        fill
                        style={{ objectFit: 'cover' }}
                        loading="lazy"
                        sizes="(max-width: 300px) 100vw, 300px"
                      />
                    </div>
                    <div className="p-4 bg-white">
                      <h2 className="font-script text-xl text-rose-pink">{img.caption}</h2>
                      <p className="text-sm text-gray-700 mt-2">{img.details}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="mt-24 flex gap-4">
              <button
                onClick={prevImage}
                className="bg-rose-pink hover:bg-rose-pink/90 text-white px-4 py-2 rounded-full"
              >
                ← Previous
              </button>
              <button
                onClick={nextImage}
                className="bg-rose-pink hover:bg-rose-pink/90 text-white px-4 py-2 rounded-full"
              >
                Next →
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={closeGallery}
              className="absolute top-6 right-6 text-white text-2xl"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
