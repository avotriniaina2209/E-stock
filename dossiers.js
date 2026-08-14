import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { verifierJeton } from '../middleware/auth.js';
import { sauvegarder } from '../stockage.js';

const routeur = express.Router();

// Obtenir tous les dossiers
routeur.get('/', verifierJeton, (req, res) => {
  const dossiers = global.dossiers.filter(d => d.nomUtilisateur === req.email);
  res.json(dossiers);
});

// Créer un dossier
routeur.post('/', verifierJeton, (req, res) => {
  const { nom, parent } = req.body;

  if (!nom) {
    return res.status(400).json({ erreur: 'Nom du dossier requis' });
  }

  const nouveauDossier = {
    id: uuidv4(),
    nomUtilisateur: req.email,
    nom,
    dateCreation: new Date(),
    parent: parent || null
  };

  global.dossiers.push(nouveauDossier);
  sauvegarder();

  res.status(201).json({
    succes: true,
    dossier: nouveauDossier
  });
});

// Mettre à jour un dossier
routeur.put('/:id', verifierJeton, (req, res) => {
  const { id } = req.params;
  const { nom } = req.body;

  const dossier = global.dossiers.find(d => d.id === id && d.nomUtilisateur === req.email);

  if (!dossier) {
    return res.status(404).json({ erreur: 'Dossier non trouvé' });
  }

  if (nom) dossier.nom = nom;
  sauvegarder();

  res.json({
    succes: true,
    dossier
  });
});

// Supprimer un dossier
routeur.delete('/:id', verifierJeton, (req, res) => {
  const { id } = req.params;

  const index = global.dossiers.findIndex(d => d.id === id && d.nomUtilisateur === req.email);

  if (index === -1) {
    return res.status(404).json({ erreur: 'Dossier non trouvé' });
  }

  const dossier = global.dossiers.splice(index, 1)[0];
  sauvegarder();

  res.json({
    succes: true,
    message: 'Dossier supprimé',
    dossier
  });
});

export default routeur;
