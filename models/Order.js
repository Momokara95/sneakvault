const express = require('express');
const router = express.Router();
const Order = require('./models/Order'); // Assure-toi que ce chemin est bon vers ton modèle
// Tu peux ajouter tes services ici si nécessaire (ex: emailService)

// ==========================================
// 1. CRÉER UNE COMMANDE (POST /)
// ==========================================
router.post('/', async (req, res) => {
  try {
    console.log('📦 Nouvelle commande reçue:', req.body.orderId);

    // Création de la commande avec les données reçues
    const newOrder = new Order(req.body);
    
    // Sauvegarde dans la base de données
    const savedOrder = await newOrder.save();

    // Réponse succès
    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      order: savedOrder
    });

  } catch (error) {
    console.error('❌ Erreur création commande:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la commande',
      error: error.message
    });
  }
});

// ==========================================
// 2. OBTENIR UNE COMMANDE (GET /:id)
// ==========================================
router.get('/:id', async (req, res) => {
  try {
    // Recherche par _id ou orderId
    const order = await Order.findOne({ 
      $or: [
        { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null },
        { orderId: req.params.id }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }

    res.json({ success: true, order });

  } catch (error) {
    console.error('❌ Erreur récupération commande:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// ==========================================
// IMPORTANT : C'est cette ligne qui manquait !
// ==========================================
module.exports = router;