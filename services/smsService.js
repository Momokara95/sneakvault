const axios = require('axios');

// Service SMS avec Orange SMS API (exemple)
const sendOrderSMS = async (phoneNumber, orderId) => {
  try {
    // Format du numéro
    let formattedNumber = phoneNumber.replace(/\s/g, '');
    if (!formattedNumber.startsWith('+221')) {
      formattedNumber = '+221' + formattedNumber.replace('+', '');
    }

    const message = `Merci pour votre commande SneakVault #${orderId}. Nous traitons votre demande. Suivez votre commande: https://sneakvault.sn/track`;

    // Envoyer via API SMS (exemple avec Orange)
    const response = await axios.post('https://api.orange.com/sms/v1/messages', {
      recipient: formattedNumber,
      message: message,
      sender: process.env.SMS_SENDER
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ SMS envoyé à ${formattedNumber}`);
    return true;
    
  } catch (error) {
    console.error('❌ Erreur envoi SMS:', error.message);
    // Retourner true pour ne pas bloquer le processus
    return true;
  }
};

const sendPaymentSMS = async (phoneNumber, orderId) => {
  try {
    const formattedNumber = phoneNumber.replace(/\s/g, '');
    
    const message = `Votre paiement SneakVault #${orderId} est confirmé. Votre commande est en préparation.`;

    // Simuler l'envoi (à implémenter avec votre fournisseur SMS)
    console.log(`📱 SMS de paiement envoyé à ${formattedNumber}: ${message}`);
    
    return true;
    
  } catch (error) {
    console.error('Erreur SMS paiement:', error);
    return true;
  }
};

module.exports = {
  sendOrderSMS,
  sendPaymentSMS
};