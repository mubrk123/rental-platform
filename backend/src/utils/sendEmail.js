// 📁 backend/utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const sendEmail = async (to, booking) => {
  try {
    // ✅ Use Hostinger SMTP instead of Gmail
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.hostinger.com",
      port: process.env.SMTP_PORT || 465,
      secure: true, // true for port 465 (SSL)
      auth: {
        user: process.env.EMAIL_USER, // contact@newbikeworld.in
        pass: process.env.EMAIL_PASS, // mailbox password
      },
    });

    const mailOptions = {
      from: `"NewBikeWorld 🚲" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Booking Confirmation - NewBikeWorld",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
          <h2 style="color:#4f46e5;">Booking Confirmed!</h2>
          <p>Hi <b>${booking.name}</b>,</p>
          <p>Your booking with <b>NewBikeWorld</b> is confirmed ✅</p>
          <ul style="list-style:none;padding:0;">
            <li><b>Booking ID:</b> ${booking.bookingId}</li>
            <li><b>Vehicle ID:</b> ${booking.vehicleId}</li>
            <li><b>Location:</b> ${booking.city}</li>
            <li><b>Pickup:</b> ${booking.pickupDate}</li>
            <li><b>Dropoff:</b> ${booking.dropoffDate}</li>
            <li><b>Phone:</b> ${booking.phoneNumber}</li>
          </ul>
          <p>Thanks for choosing <b>NewBikeWorld</b>! 🚀</p>
          <hr />
          <small style="color:#777;">
            This is an automated message sent from <b>contact@newbikeworld.in</b>.
          </small>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to: ${to}`);
  } catch (error) {
    console.error("❌ Email send error:", error.message);
  }
};
