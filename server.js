require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Order = require('./models/Order');
const paydunyaService = require('./services/paydunyaService');
const emailService = require('./services/emailService');
const smsService = require('./services/smsService');

const app = express();

// Middleware
app.use(cors({
  origin: ['https://votre-site.sn', 'http://localhost:3000'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connecté'))
.catch(err => console.error('❌ Erreur MongoDB:', err));

// Routes
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    
    // Créer une nouvelle commande
    const order = new Order({
      orderId: `CMD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customer: {
        name: orderData.name,
        phone: orderData.phone,
        email: orderData.email,
        address: orderData.address,
        city: orderData.city
      },
      items: orderData.items,
      totalAmount: orderData.total,
      paymentMethod: orderData.paymentMethod,
      status: orderData.paymentMethod === 'delivery' ? 'pending' : 'awaiting_payment',
      notes: orderData.notes,
      paymentStatus: orderData.paymentMethod === 'delivery' ? 'cash_on_delivery' : 'pending'
    });

    // Sauvegarder la commande
    const savedOrder = await order.save();

    // Si paiement à la livraison
    if (orderData.paymentMethod === 'delivery') {
      // Envoyer email de confirmation
      await emailService.sendOrderConfirmation(savedOrder);
      
      // Envoyer SMS
      await smsService.sendOrderSMS(savedOrder.customer.phone, savedOrder.orderId);
      
      return res.status(201).json({
        success: true,
        message: 'Commande créée avec succès',
        order: savedOrder
      });
    }

    // Si paiement en ligne avec PayDunya
    if (orderData.paymentMethod === 'paydunya') {
      const paymentData = {
        total_amount: orderData.total,
        description: `Commande SneakVault #${savedOrder.orderId}`,
        return_url: `${process.env.FRONTEND_URL}/order-confirmation?id=${savedOrder._id}`,
        cancel_url: `${process.env.FRONTEND_URL}#contact`,
        callback_url: `https://votre-backend.sneakvault.sn/api/paydunya-webhook`,
        items: orderData.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity
        }))
      };

      // Créer l'invoice PayDunya
      const invoice = await paydunyaService.createInvoice(paymentData, savedOrder._id);
      
      return res.status(201).json({
        success: true,
        message: 'Facture PayDunya créée',
        invoiceUrl: invoice.url,
        order: savedOrder
      });
    }

  } catch (error) {
    console.error('Erreur création commande:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la commande'
    });
  }
});

// Webhook PayDunya
app.post('/api/paydunya-webhook', async (req, res) => {
  try {
    const data = req.body;
    
    // Vérifier la signature
    if (!paydunyaService.verifyWebhook(data)) {
      return res.status(400).send('Signature invalide');
    }

    const orderId = data.custom_data.order_id;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).send('Commande non trouvée');
    }

    // Mettre à jour le statut de la commande
    if (data.status === 'completed') {
      order.status = 'paid';
      order.paymentStatus = 'paid';
      order.paymentDetails = {
        transactionId: data.transaction_id,
        paymentMethod: data.payment_method,
        paidAt: new Date()
      };
      
      await order.save();
      
      // Envoyer les confirmations
      await emailService.sendPaymentConfirmation(order);
      await smsService.sendPaymentSMS(order.customer.phone, order.orderId);
      
      console.log(`✅ Paiement confirmé pour la commande ${order.orderId}`);
    } else if (data.status === 'failed') {
      order.status = 'payment_failed';
      await order.save();
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Erreur webhook:', error);
    res.status(500).send('Erreur serveur');
  }
});

// Récupérer une commande
app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }
    
    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Dashboard - Récupérer toutes les commandes (protéger cette route en production!)
app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Vérifier le statut du serveur
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    service: 'SneakVault Backend'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur le port ${PORT}`);
});