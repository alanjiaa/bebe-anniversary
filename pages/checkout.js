// pages/checkout.js
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ReceiptPage() {
  const [purchase, setPurchase] = useState(null)

  // Load last purchase only on the client
  useEffect(() => {
    const raw = localStorage.getItem('lastPurchase')
    if (raw) setPurchase(JSON.parse(raw))
  }, [])

  if (!purchase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream p-8">
        <p className="text-xl">No recent purchase found.</p>
        <Link href="/shop" className="ml-4 text-rose-pink underline">
          Back to Shop
        </Link>
      </div>
    )
  }

  const downloadPDF = async () => {
    // dynamically import jsPDF only in the browser
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'letter' })

    doc.setFontSize(20)
    doc.setTextColor('#D63384') // rose-pink
    doc.text('🎀 Alsie Shop Receipt 🎀', 40, 60)
    doc.setFontSize(12)
    doc.setTextColor('#333')
    doc.text(`Date: ${new Date(purchase.date).toLocaleString()}`, 40, 90)

    let y = 120
    doc.setDrawColor('#FADADD')
    doc.setLineWidth(10)
    doc.line(30, y + 5, 560, y + 5)

    purchase.items.forEach((item) => {
      doc.setFont('helvetica', 'bold')
      doc.text(`${item.name} x${item.qty}`, 40, (y += 30))
      doc.setFont('helvetica', 'normal')
      doc.text(`${item.points * item.qty} pts`, 480, y, { align: 'right' })
    })

    y += 30
    doc.setDrawColor('#FADADD')
    doc.line(30, y + 5, 560, y + 5)

    doc.setFont('helvetica', 'bold')
    doc.text(`Total Spent: ${purchase.total} pts`, 40, (y += 30))

    doc.setFontSize(10)
    doc.setTextColor('#666')
    doc.text(`Thank you for shopping at Alsie Shop! 💖`, 40, 750)

    doc.save('Alsie_Receipt.pdf')
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-cream p-8">
      <h1 className="font-script text-4xl text-rose-pink mb-6">Your Receipt</h1>
      <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-md">
        <p className="mb-2">
          <strong>Date:</strong> {new Date(purchase.date).toLocaleString()}
        </p>
        <ul className="divide-y divide-gray-200 mb-4">
          {purchase.items.map((item, i) => (
            <li key={i} className="py-2 flex justify-between">
              <span>
                {item.name} x{item.qty}
              </span>
              <span>{item.points * item.qty} pts</span>
            </li>
          ))}
        </ul>
        <p className="text-right font-semibold mb-6">
          Total: {purchase.total} pts
        </p>
        <button
          onClick={downloadPDF}
          className="w-full bg-rose-pink hover:bg-rose-pink/90 text-white py-3 rounded-lg transition"
        >
          Download PDF Receipt
        </button>
      </div>
      <Link href="/home" className="mt-6 text-soft-lavender underline hover:text-soft-lavender/90">
        ← Back to Menu
      </Link>
    </div>
  )
}
