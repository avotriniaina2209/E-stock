import express from 'express';
import { verifierJeton } from '../middleware/auth.js';

const routeur = express.Router();

// Obtenir les statistiques du dashboard
routeur.get('/stats', verifierJeton, (req, res) => {
  const fichiers = global.fichiers.filter(f => f.nomUtilisateur === req.email);
  const utilisateur = global.utilisateurs.find(u => u.email === req.email);

  const stats = {
    stockageUtilise: fichiers.reduce((acc, f) => acc + f.taille, 0),
    stockageMax: utilisateur?.stockageMax || 50,
    nombreFichiers: fichiers.length,
    nombreFavori: fichiers.filter(f => f.favori).length,
    nombreDossiers: global.dossiers.filter(d => d.nomUtilisateur === req.email).length,
    typesFichiers: {
      images: fichiers.filter(f => f.type === 'image').length,
      videos: fichiers.filter(f => f.type === 'video').length,
      documents: fichiers.filter(f => ['pdf', 'texte', 'feuille'].includes(f.type)).length,
      code: fichiers.filter(f => f.type === 'code').length,
      autres: fichiers.filter(f => !['image', 'video', 'pdf', 'texte', 'feuille', 'code'].includes(f.type)).length
    },
    tailleParType: {
      images: fichiers.filter(f => f.type === 'image').reduce((acc, f) => acc + f.taille, 0),
      videos: fichiers.filter(f => f.type === 'video').reduce((acc, f) => acc + f.taille, 0),
      documents: fichiers.filter(f => ['pdf', 'texte', 'feuille'].includes(f.type)).reduce((acc, f) => acc + f.taille, 0),
      code: fichiers.filter(f => f.type === 'code').reduce((acc, f) => acc + f.taille, 0),
      autres: fichiers.filter(f => !['image', 'video', 'pdf', 'texte', 'feuille', 'code'].includes(f.type)).reduce((acc, f) => acc + f.taille, 0)
    }
  };

  res.json(stats);
});

// Obtenir l'historique des fichiers (derniers 30 jours)
routeur.get('/historique', verifierJeton, (req, res) => {
  const fichiers = global.fichiers.filter(f => f.nomUtilisateur === req.email);
  
  // Grouper par date
  const historique = {};
  fichiers.forEach(f => {
    const date = f.dateCreation.toISOString().split('T')[0];
    if (!historique[date]) {
      historique[date] = 0;
    }
    historique[date]++;
  });

  const donnees = Object.entries(historique).map(([date, count]) => ({
    date,
    nombre: count
  })).sort((a, b) => new Date(a.date) - new Date(b.date));

  res.json(donnees);
});

// Obtenir les fichiers récents
routeur.get('/recents', verifierJeton, (req, res) => {
  const fichiers = global.fichiers
    .filter(f => f.nomUtilisateur === req.email)
    .sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation))
    .slice(0, 10);

  res.json(fichiers);
});

// Obtenir les fichiers favoris
routeur.get('/favoris', verifierJeton, (req, res) => {
  const fichiers = global.fichiers.filter(f => f.nomUtilisateur === req.email && f.favori);
  res.json(fichiers);
});

export default routeur;
