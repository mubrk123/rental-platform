// backend/utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.hostinger.com",
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

export const sendEmail = async (to, booking) => {
  try {
    const transporter = createTransporter();

    const header = `
      <div style="background:#4f46e5;color:white;padding:18px 25px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:22px;letter-spacing:1px;">NewBikeWorld 🚲</h1>
        <p style="margin:5px 0 0;font-size:13px;opacity:0.9;">Ride. Explore. Experience Freedom.</p>
      </div>
    `;

    const footer = `
      <hr style="border:none;border-top:1px solid #eee;margin:30px 0 15px;"/>
      <p style="font-size:12px;color:#777;text-align:center;">
        This email was sent from <b>${process.env.EMAIL_USER}</b><br/>
        © ${new Date().getFullYear()} NewBikeWorld. All rights reserved.
      </p>
    `;

    let subject = "";
    let html = "";

    /* --------------------------------------------------
        COMPLETION EMAIL
    -------------------------------------------------- */
    if (booking.completed) {
      subject = `Ride Completed – Thank You, ${booking.name || "Customer"}!`;

      html = `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #eaeaea;border-radius:8px;overflow:hidden;">
          ${header}
          <div style="padding:25px;">
            <h2 style="color:#333;">Thank You for Riding with Us, ${booking.name || ""}!</h2>
            <p style="font-size:15px;line-height:1.6;color:#555;">
              Your ride with <b>${booking.vehicleName || ""} ${booking.vehicleModel || ""}</b> is completed.
            </p>

            <div style="background:#f9f9ff;border-left:4px solid #4f46e5;padding:12px 18px;margin:18px 0;border-radius:6px;">
              <p><b>Booking ID:</b> ${booking.bookingId || ""}</p>
              <p><b>Location:</b> ${booking.city || ""}</p>
              <p><b>Pickup:</b> ${booking.pickupDate ? new Date(booking.pickupDate).toLocaleDateString() : ""}</p>
              <p><b>Dropoff:</b> ${booking.dropoffDate ? new Date(booking.dropoffDate).toLocaleDateString() : ""}</p>
            </div>

            <p style="color:#333;">We hope you enjoyed your ride. Come back soon! 💙</p>
          </div>
          ${footer}
        </div>
      `;
    }

    /* --------------------------------------------------
        BOOKING CONFIRMATION EMAIL
    -------------------------------------------------- */
    else {
      subject = `Booking Confirmed – ${booking.vehicleName || ""} ${booking.vehicleModel || ""}`;

      html = `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #eaeaea;border-radius:8px;overflow:hidden;">
          ${header}
          <div style="padding:25px;">
            <h2 style="color:#333;">Your Booking is Confirmed 🎉</h2>
            <p style="font-size:15px;line-height:1.6;color:#555;">
              Hi <b>${booking.name || ""}</b>,<br/>
              Your booking with <b>NewBikeWorld</b> is confirmed.
            </p>

            <div style="background:#f9f9ff;border-left:4px solid #4f46e5;padding:12px 18px;margin:18px 0;border-radius:6px;">
              <p><b>Booking ID:</b> ${booking.bookingId || ""}</p>
              <p><b>Vehicle:</b> ${booking.vehicleName || ""} ${booking.vehicleModel || ""}</p>
              <p><b>Location:</b> ${booking.city || ""}</p>
              <p><b>Pickup:</b> ${booking.pickupDate ? new Date(booking.pickupDate).toLocaleString() : ""}</p>
              <p><b>Dropoff:</b> ${booking.dropoffDate ? new Date(booking.dropoffDate).toLocaleString() : ""}</p>
              <p><b>Contact:</b> ${booking.phoneNumber || ""}</p>
            </div>

            <p style="color:#333;">For support, contact <b>${process.env.EMAIL_USER}</b>.</p>
          </div>
          ${footer}
        </div>
      `;
    }

    await transporter.sendMail({
      from: `"NewBikeWorld 🚲" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Email send failed:", err.message || err);
  }
};
