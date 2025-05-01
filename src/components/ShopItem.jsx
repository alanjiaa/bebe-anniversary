export default function ShopItem({ item, addToCart }) {
    return (
      <div className="border rounded-lg p-4 shadow-lg">
        <h3 className="text-lg font-semibold">{item.name}</h3>
        <p>{item.points} Alsie Points</p>
        <button
          className="bg-pink-400 text-white py-1 px-3 rounded mt-2"
          onClick={() => addToCart(item)}
        >
          Add to Basket
        </button>
      </div>
    );
  }
  