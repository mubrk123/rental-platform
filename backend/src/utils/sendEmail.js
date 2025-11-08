// 📁 backend/utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

/**
 * ✨ Send professional booking confirmation or thank-you email
 */
export const sendEmail = async (to, booking) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.hostinger.com",
      port: process.env.SMTP_PORT || 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const header = `
      <div style="background:#4f46e5;color:white;padding:18px 25px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:22px;letter-spacing:1px;">NewBikeWorld 🚲</h1>
        <p style="margin:5px 0 0;font-size:13px;opacity:0.9;">Ride. Explore. Experience Freedom.</p>
      </div>
    `;

    const footer = `
      <hr style="border:none;border-top:1px solid #eee;margin:30px 0 15px;"/>
      <p style="font-size:12px;color:#777;text-align:center;">
        This email was sent from <b>contact@newbikeworld.in</b><br/>
        © ${new Date().getFullYear()} NewBikeWorld. All rights reserved.
      </p>
    `;

    // ✅ Choose template
    let subject, html;

    if (booking.completed) {
      subject = `Ride Completed – Thank You, ${booking.name}! 🚴‍♂️`;
      html = `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #eaeaea;border-radius:8px;overflow:hidden;">
          ${header}
          <div style="padding:25px;">
            <h2 style="color:#333;">Thank You for Riding with Us, ${booking.name}! 💙</h2>
            <p style="font-size:15px;line-height:1.6;color:#555;">
              Your ride with <b>${booking.vehicleName} ${booking.vehicleModel}</b> has been successfully completed.
              We hope you had an amazing experience exploring ${booking.city} on two wheels!
            </p>
            <div style="background:#f9f9ff;border-left:4px solid #4f46e5;padding:12px 18px;margin:18px 0;border-radius:6px;">
              <p style="margin:6px 0;"><b>Booking ID:</b> ${booking.bookingId}</p>
              <p style="margin:6px 0;"><b>Vehicle:</b> ${booking.vehicleName} ${booking.vehicleModel}</p>
              <p style="margin:6px 0;"><b>Location:</b> ${booking.city}</p>
              <p style="margin:6px 0;"><b>Pickup:</b> ${new Date(booking.pickupDate).toLocaleDateString()}</p>
              <p style="margin:6px 0;"><b>Dropoff:</b> ${new Date(booking.dropoffDate).toLocaleDateString()}</p>
            </div>
            <p style="color:#333;">We truly appreciate your trust in <b>NewBikeWorld</b> and look forward to serving you again soon! 🌟</p>
          </div>
          ${footer}
        </div>
      `;
    } else {
      subject = `Booking Confirmed – ${booking.vehicleName} ${booking.vehicleModel} 🚲`;
      html = `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #eaeaea;border-radius:8px;overflow:hidden;">
          ${header}
          <div style="padding:25px;">
            <h2 style="color:#333;">Your Booking is Confirmed ✅</h2>
            <p style="font-size:15px;line-height:1.6;color:#555;">
              Hi <b>${booking.name}</b>,<br/>
              Great news! Your booking with <b>NewBikeWorld</b> has been successfully confirmed.
            </p>
            <div style="background:#f9f9ff;border-left:4px solid #4f46e5;padding:12px 18px;margin:18px 0;border-radius:6px;">
              <p style="margin:6px 0;"><b>Booking ID:</b> ${booking.bookingId}</p>
              <p style="margin:6px 0;"><b>Vehicle:</b> ${booking.vehicleName} ${booking.vehicleModel}</p>
              <p style="margin:6px 0;"><b>Location:</b> ${booking.city}</p>
              <p style="margin:6px 0;"><b>Pickup:</b> ${new Date(booking.pickupDate).toLocaleString()}</p>
              <p style="margin:6px 0;"><b>Dropoff:</b> ${new Date(booking.dropoffDate).toLocaleString()}</p>
              <p style="margin:6px 0;"><b>Contact:</b> ${booking.phoneNumber}</p>
            </div>
            <p style="color:#333;">Get ready to ride your <b>${booking.vehicleName}</b> and experience the thrill of the open road! 🏍️</p>
            <p style="margin-top:10px;">For any support, reach us at <b>support@newbikeworld.in</b>.</p>
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

    console.log(`✅ Professional email sent successfully to ${to}`);
  } catch (error) {
    console.error("❌ Email send failed:", error.message);
  }
};
