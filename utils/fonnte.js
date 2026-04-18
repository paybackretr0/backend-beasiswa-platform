const axios = require("axios");

const sendWhatsAppMessage = async (target, message) => {
  try {
    const response = await axios.post(
      "https://api.fonnte.com/send",
      {
        target: target,
        message: message,
        countryCode: "62",
      },
      {
        headers: {
          Authorization: process.env.FONNTE_TOKEN,
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "Gagal mengirim pesan WA via Fonnte:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

module.exports = { sendWhatsAppMessage };
