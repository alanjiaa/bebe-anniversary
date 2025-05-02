import { useState } from 'react';
import ShopItem from './ShopItem';

const items = [
  { id: 1, name: 'Free Boba 🧋', points: 20 },
  { id: 2, name: 'Massage 💆‍♀️', points: 50 },
  { id: 3, name: 'Cinema Date', points: 80 },
  { id: 4, name: 'Meet Fresh', points: 30 },
  { id: 5, name: 'Fried Chicken', points: 65 },
  { id: 6, name: 'Free Coffee', points: 10 },
  { id: 7, name: 'Sephora Gift', points: 500 }
];

export default function Shop() {
  const [cart, setCart] = useState([]);
  const [alsiePoints, setAlsiePoints] = useState(150);

  const addToCart = (item) => setCart([...cart, item]);

  const checkout = () => {
    const totalPoints = cart.reduce((sum, item) => sum + item.points, 0);
    if (totalPoints > alsiePoints) {
      alert('Not enough Alsie Points!');
      return;
    }
    setAlsiePoints(alsiePoints - totalPoints);
    alert('Checkout complete! Enjoy your gifts 🎁');
    setCart([]);
  };

  return (
    // src/components/Shop.jsx

<div className="min-h-screen p-8 bg-cream">
  <h1 className="text-4xl font-script text-center text-soft-lavender mb-8">
    🛍️ Alsie Shop
  </h1>
  <p className="text-center mb-6 text-lg">
    Your Alsie Points: <span className="font-bold">{alsiePoints}</span>
  </p>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {items.map((item) => (
      <div
        key={item.id}
        className="bg-white p-6 rounded-2xl shadow-lg flex flex-col items-center"
      >
        <h3 className="font-script text-2xl mb-2">{item.name}</h3>
        <p className="text-gray-600">{item.points} Points</p>
        <button
          onClick={() => addToCart(item)}
          className="mt-4 bg-soft-lavender hover:bg-soft-lavender/90 text-white font-semibold px-5 py-2 rounded-full transition"
        >
          Add to Basket
        </button>
      </div>
    ))}
  </div>

  <div className="text-center mt-10">
    <button
      onClick={checkout}
      className="bg-rose-pink hover:bg-rose-pink/90 text-white font-bold py-3 px-8 rounded-full transition"
    >
      Checkout ({cart.length} items)
    </button>
  </div>
</div>

  );
}
