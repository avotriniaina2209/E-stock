import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import routesAuth from './routes/auth.js';
import routesFichiers from './routes/fichiers.js';
import routesDossiers from './routes/dossiers.js';
import routesDashboard from './routes/dashboard.js';
import { sauvegarder } from './stockage.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const originesAutorisees = (process.env.CORS_ORIGIN || '*').split(',').map(origin => origin.trim()).filter(Boolean);
app.use(cors({
  origin: (origine, callback) => {
    if (!origine || originesAutorisees.includes('*') || originesAutorisees.includes(origine)) return callback(null, true);
    return callback(new Error('Origine CORS non autorisée'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Stockage persistant JSON : aucune donnée de démonstration n'est injectée.
sauvegarder();

// Routes
app.use('/api/auth', routesAuth);
app.use('/api/fichiers', routesFichiers);
app.use('/api/dossiers', routesDossiers);
app.use('/api/dashboard', routesDashboard);

// Route de santé
app.get('/api/sante', (req, res) => {
  res.json({ statut: 'OK', message: 'Serveur E-Stock en ligne' });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    erreur: 'Erreur serveur',
    message: err.message 
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur E-Stock démarré sur http://localhost:${PORT}`);
  console.log(`📡 CORS activé pour: ${process.env.CORS_ORIGIN || '*'}`);
  console.log('💾 Stockage JSON persistant activé.');
});
