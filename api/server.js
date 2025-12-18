require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

// ==================== IMPORTS (Chemins relatifs corrigés pour le dossier api/) ====================
const Order = require('../models/Order');
const paydunyaService = require('../services/paydunyaService');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const orderRoutes = require('../orders');
const webhookRoutes = require('../paydunya-webhook');

const app = express();

// ==================== CONFIGURATION DU SERVEUR ====================

console.log('='.repeat(60));
console.log('🚀 DÉMARRAGE SNEAKVAULT BACKEND');
console.log('='.repeat(60));

// 1. Middleware de sécurité Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// 2. Configuration CORS (C'est ici que ton erreur était !)
const allowedOrigins = [
  'https://sneakvault.netlify.app',                // Ton Frontend
  'https://sneakvault-production.up.railway.app',  // Ton Backend (Vérifie que c'est bien cette URL sur Railway)
  'http://localhost:3000',                         // Dev Local React
  'http://localhost:5173'                          // Dev Local Vite
];

app.use(cors({
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine (comme Postman ou applications mobiles)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'La politique CORS de ce site ne permet pas l\'accès depuis l\'origine : ' + origin;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Parsers pour le corps des requêtes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ==================== CONNEXION BASE DE DONNÉES ====================

console.log('📡 Connexion à MongoDB...');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ ERREUR: MONGODB_URI non définie.');
  console.log('⚠️ Vérifiez vos variables d\'environnement sur Railway.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB connecté avec succès');
  
  mongoose.connection.on('error', (err) => {
    console.error('❌ Erreur MongoDB:', err.message);
  });
  
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB déconnecté');
  });
})
.catch((err) => {
  console.error('❌ Erreur connexion MongoDB:', err.message);
  console.log('💡 Avez-vous ajouté l\'IP 0.0.0.0/0 dans MongoDB Atlas Network Access ?');
  // On ne quitte pas le processus ici pour laisser le serveur répondre au Healthcheck si possible,
  // mais sans DB, l'API sera limitée.
});

// ==================== ROUTES DE BASE & HEALTHCHECK ====================

// Route Healthcheck (Vitale pour Railway)
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'healthy',
    service: 'SneakVault Backend',
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Route Racine
app.get('/', (req, res) => {
  res.json({
    message: '🚀 SneakVault API is Running',
    endpoints: {
      health: 'GET /api/health',
      orders: 'POST /api/orders'
    }
  });
});

// ==================== ROUTES API ====================

app.use('/api/orders', orderRoutes);
app.use('/api/webhooks', webhookRoutes);

// ==================== ROUTES DE TEST & DEBUG ====================

app.get('/api/paydunya/status', (req, res) => {
  const hasKeys = process.env.PAYDUNYA_MASTER_KEY && 
                  process.env.PAYDUNYA_PRIVATE_KEY && 
                  process.env.PAYDUNYA_PUBLIC_KEY;
  res.json({
    configured: hasKeys,
    mode: process.env.PAYDUNYA_MODE || 'unknown',
    store: process.env.STORE_NAME || 'SneakVault'
  });
});

// ==================== GESTION DES ERREURS (404 & Global) ====================

// 404 - Route non trouvée
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route API non trouvée',
    path: req.originalUrl
  });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('🔥 Erreur Serveur:', err.stack);
  
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'Erreur CORS : Origine non autorisée'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur'
  });
});

// ==================== DÉMARRAGE DU SERVEUR ====================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
});