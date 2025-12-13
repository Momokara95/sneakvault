const nodemailer = require('nodemailer');
const formatPrice = (price) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(price).replace('XOF', 'FCFA');

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Email de confirmation de commande
const sendOrderConfirmation = async (order) => {
  try {
    const itemsHTML = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <img src="${item.image}" alt="${item.name}" width="80" style="border-radius: 8px;">
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${formatPrice(item.price)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${formatPrice(item.price * item.quantity)}</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: `"SneakVault" <${process.env.STORE_EMAIL}>`,
      to: order.customer.email,
      subject: `✅ Confirmation de commande #${order.orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Merci pour votre commande !</h1>
            <p style="opacity: 0.9;">Votre commande #${order.orderId} a été reçue avec succès</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Résumé de la commande</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #667eea; color: white;">
                  <th style="padding: 10px;">Produit</th>
                  <th style="padding: 10px;">Nom</th>
                  <th style="padding: 10px;">Quantité</th>
                  <th style="padding: 10px;">Prix unitaire</th>
                  <th style="padding: 10px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>
            
            <div style="text-align: right; margin-top: 20px;">
              <h3>Total: <span style="color: #667eea;">${formatPrice(order.totalAmount)}</span></h3>
            </div>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2>Informations de livraison</h2>
            <p><strong>Nom:</strong> ${order.customer.name}</p>
            <p><strong>Téléphone:</strong> ${order.customer.phone}</p>
            <p><strong>Adresse:</strong> ${order.customer.address}, ${order.customer.city}</p>
            <p><strong>Mode de paiement:</strong> ${order.paymentMethod === 'delivery' ? 'Paiement à la livraison' : 'Paiement en ligne'}</p>
            <p><strong>Statut:</strong> ${order.status === 'pending' ? 'En attente de traitement' : order.status}</p>
          </div>
          
          <div style="padding: 20px; text-align: center; background: #f0f0f0; border-radius: 0 0 10px 10px;">
            <p>Pour toute question, contactez-nous au ${process.env.STORE_PHONE}</p>
            <p>© 2025 SneakVault. Tous droits réservés.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de confirmation envoyé à ${order.customer.email}`);
    
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    // Ne pas throw pour ne pas bloquer le processus de commande
  }
};

// Email de confirmation de paiement
const sendPaymentConfirmation = async (order) => {
  try {
    const mailOptions = {
      from: `"SneakVault" <${process.env.STORE_EMAIL}>`,
      to: order.customer.email,
      subject: `✅ Paiement confirmé - Commande #${order.orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2ecc71; padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Paiement confirmé !</h1>
            <p>Votre paiement pour la commande #${order.orderId} a été validé.</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <p>Bonjour ${order.customer.name},</p>
            <p>Nous avons bien reçu votre paiement de <strong>${formatPrice(order.totalAmount)}</strong>.</p>
            <p>Votre commande est maintenant en cours de préparation.</p>
            <p>Vous recevrez une notification dès que votre colis sera expédié.</p>
            <br>
            <p>Merci de votre confiance,</p>
            <p><strong>L'équipe SneakVault</strong></p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de paiement envoyé à ${order.customer.email}`);
    
  } catch (error) {
    console.error('❌ Erreur envoi email paiement:', error);
  }
};

module.exports = {
  sendOrderConfirmation,
  sendPaymentConfirmation
};