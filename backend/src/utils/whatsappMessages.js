import { client } from "./twilioClient.js";
import { pickupLocations } from "./locationMap.js";

/**
 * Send confirmation message to the customer
 */
export const sendBookingConfirmationToUser = async (booking) => {
  try {
    const cityKey = booking.city?.trim().toLowerCase();
    const locationData =
      pickupLocations[cityKey] || pickupLocations["indore"];
    const { address, link } = locationData;

    await client.messages.create({
      from: "whatsapp:+14155238886", // Twilio sandbox or approved number
      to: `whatsapp:+91${booking.phoneNumber}`,
      contentSid: "HX0129fad7f0d2be3b85c43b204ae4e8dd", // your template SID
      contentVariables: JSON.stringify({
        name: booking.name,
        booking_id: booking._id,
        pickup_date: booking.pickupDate,
        dropoff_date: booking.dropoffDate,
        pickup_location: `${address}\n📍 ${link}`,
      }),
    });

    console.log("✅ WhatsApp booking confirmation sent to user:", booking.phoneNumber);
  } catch (err) {
    console.error("❌ Error sending WhatsApp to user:", err.message);
  }
};

/**
 * Send booking summary to admin
 */
export const sendBookingNotificationToAdmin = async (booking) => {
  try {
    const cityKey = booking.city?.trim().toLowerCase();
    const locationData =
      pickupLocations[cityKey] || pickupLocations["indore"];
    const { address, link } = locationData;

    const messageText = `
📢 *New Booking Received!*

👤 Name: ${booking.name}
📞 Phone: +91${booking.phoneNumber}
📧 Email: ${booking.email}
🏙️ City: ${booking.city}

🚗 Vehicle: ${booking.vehicleName || "N/A"}
🗓️ Pickup: ${booking.pickupDate}
🗓️ Dropoff: ${booking.dropoffDate}

📍 Pickup Location:
${address}
${link}

🧾 Booking ID: ${booking._id}
`;

    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: process.env.ADMIN_WHATSAPP_NUMBER,
      body: messageText,
    });

    console.log("✅ WhatsApp notification sent to admin");
  } catch (err) {
    console.error("❌ Error sending WhatsApp to admin:", err.message);
  }
};
