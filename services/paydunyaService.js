const Paydunya = require('paydunya');
const axios = require('axios');

// Configuration PayDunya
const setupPaydunya = (mode = 'live') => {
  const paydunya = new Paydunya({
    masterKey: process.env.PAYDUNYA_MASTER_KEY,
    privateKey: process.env.PAYDUNYA_PRIVATE_KEY,
    publicKey: process.env.PAYDUNYA_PUBLIC_KEY,
    token: process.env.PAYDUNYA_TOKEN,
    mode: mode
  });

  paydunya.store = {
    name: process.env.STORE_NAME,
    tagline: process.env.STORE_TAGLINE,
    postal_address: "Dakar, Sénégal",
    phone: process.env.STORE_PHONE,
    website_url: process.env.FRONTEND_URL,
    logo_url: `${process.env.FRONTEND_URL}/logo.png`
  };

  return paydunya;
};

// Créer une facture
const createInvoice = async (invoiceData, orderId) => {
  try {
    const paydunya = setupPaydunya(process.env.PAYDUNYA_MODE);
    
    const invoice = new paydunya.Invoice({
      items: invoiceData.items,
      total_amount: invoiceData.total_amount,
      description: invoiceData.description
    });

    // URLs de callback
    invoice.callback_url = invoiceData.callback_url;
    invoice.return_url = invoiceData.return_url;
    invoice.cancel_url = invoiceData.cancel_url;
    
    // Données personnalisées
    invoice.addCustomData('order_id', orderId);
    invoice.addCustomData('store', 'SneakVault');

    // Créer la facture
    const success = await invoice.create();
    
    if (success) {
      return {
        success: true,
        url: invoice.url,
        token: invoice.token
      };
    } else {
      console.error('Erreur création facture:', invoice.response_text);
      throw new Error(invoice.response_text || 'Erreur PayDunya');
    }
  } catch (error) {
    console.error('Erreur PayDunya Service:', error);
    throw error;
  }
};

// Vérifier le statut d'une facture
const checkInvoiceStatus = async (token) => {
  try {
    const paydunya = setupPaydunya(process.env.PAYDUNYA_MODE);
    const invoice = new paydunya.Invoice({ token });
    
    const success = await invoice.confirm();
    
    return {
      success: invoice.status === 'completed',
      status: invoice.status,
      data: invoice
    };
  } catch (error) {
    console.error('Erreur vérification statut:', error);
    throw error;
  }
};

// Vérifier la signature du webhook
const verifyWebhook = (data) => {
  const paydunya = setupPaydunya(process.env.PAYDUNYA_MODE);
  return paydunya.verifyWebhook(data);
};

module.exports = {
  createInvoice,
  checkInvoiceStatus,
  verifyWebhook
};