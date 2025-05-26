// pages/api/sendSuggestion.js
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST allowed' })
  }

  const { userEmail, message } = req.body

  if (!userEmail || !message) {
    return res.status(400).json({ message: 'Missing userEmail or message' })
  }

  // Configure your email transporter (example using Gmail SMTP)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,       // your gmail address (set in .env.local)
      pass: process.env.EMAIL_PASSWORD,   // your gmail app password (set in .env.local)
    },
  })

  const mailOptions = {
  from: `"Suggestion Box" <${process.env.EMAIL_USER}>`,    // your Gmail
  to: process.env.EMAIL_RECEIVER,                         // where you want to receive the email
  subject: `New suggestion from ${userEmail}`,
  text: message,
  replyTo: userEmail,  // set reply-to so you can reply directly to user
}


  try {
    await transporter.sendMail(mailOptions)
    return res.status(200).json({ message: 'Suggestion sent successfully' })
  } catch (error) {
    console.error('Error sending email:', error)
    return res.status(500).json({ message: 'Failed to send email' })
  }
}
