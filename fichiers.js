import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import { verifierJeton } from '../middleware/auth.js';
import { sauvegarder } from '../stockage.js';

const routeur = express.Router();
const __filename = fileURLToPath(import.meta.url);
const dossierFichiers = path.join(path.dirname(__filename), '..', 'donnees', 'fichiers');
fs.mkdirSync(dossierFichiers, { recursive: true });

const nettoyerNom = nom => String(nom || 'fichier').replace(/[^a-zA-Z0-9À-ÿ._-]/g, '_').slice(0, 180) || 'fichier';
const typeDepuisNom = nom => { const ext = String(nom).toLowerCase().split('.').pop(); if (['js','ts','html','css','json','py','php','java'].includes(ext)) return 'code'; if (['txt','md','rtf'].includes(ext)) return 'texte'; if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return 'image'; if (['mp4','mov','webm','avi'].includes(ext)) return 'video'; if (['mp3','wav','ogg'].includes(ext)) return 'audio'; if (ext === 'pdf') return 'pdf'; if (['zip','rar','7z'].includes(ext)) return 'archive'; if (['xlsx','csv'].includes(ext)) return 'feuille'; return 'document'; };
const stockageUpload = multer({ storage: multer.diskStorage({ destination: (_req, _file, cb) => cb(null, dossierFichiers), filename: (_req, file, cb) => cb(null, `${uuidv4()}-${nettoyerNom(file.originalname)}`) }), limits: { fileSize: Number(process.env.MAX_FILE_SIZE || 2000000000) } });
const pourUtilisateur = email => global.fichiers.filter(f => f.nomUtilisateur === email);
const trouverFichier = (id, email) => global.fichiers.find(f => String(f.id) === String(id) && f.nomUtilisateur === email);
const enregistrer = () => sauvegarder();

routeur.get('/', verifierJeton, (req, res) => res.json(pourUtilisateur(req.email)));

routeur.get('/stats', verifierJeton, (req, res) => {
  const fichiers = pourUtilisateur(req.email);
  res.json({ total: fichiers.length, images: fichiers.filter(f => f.type === 'image').length, videos: fichiers.filter(f => f.type === 'video').length, documents: fichiers.filter(f => ['pdf', 'texte', 'feuille', 'document'].includes(f.type)).length, code: fichiers.filter(f => f.type === 'code').length, autres: fichiers.filter(f => !['image', 'video', 'pdf', 'texte', 'feuille', 'code', 'document'].includes(f.type)).length, tailleTotal: fichiers.reduce((acc, f) => acc + Number(f.taille || 0), 0) });
});

routeur.get('/type/:type', verifierJeton, (req, res) => res.json(pourUtilisateur(req.email).filter(f => f.type === req.params.type)));

routeur.post('/upload', verifierJeton, stockageUpload.array('fichiers', 50), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ erreur: 'Aucun fichier reçu' });
  const fichiers = req.files.map(fichierUpload => ({ id: uuidv4(), nomUtilisateur: req.email, nom: fichierUpload.originalname, nomStockage: fichierUpload.filename, emplacement: fichierUpload.path, type: typeDepuisNom(fichierUpload.originalname), mimeType: fichierUpload.mimetype, taille: fichierUpload.size, dateCreation: new Date(), dossier: null, favori: false, partage: false }));
  global.fichiers.push(...fichiers);
  enregistrer();
  res.status(201).json({ succes: true, fichiers });
});

routeur.post('/', verifierJeton, (req, res) => res.status(400).json({ erreur: 'Utilisez l’endpoint multipart /api/fichiers/upload pour importer un fichier réel.' }));

routeur.post('/coller', verifierJeton, (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const sources = ids.map(id => trouverFichier(id, req.email)).filter(Boolean);
  if (!sources.length) return res.status(400).json({ erreur: 'Aucun fichier copiable trouvé.' });
  const copies = [];
  for (const source of sources) {
    if (!source.emplacement || !fs.existsSync(source.emplacement)) continue;
    const ext = path.extname(source.nom);
    const base = path.basename(source.nom, ext);
    const nom = `${base} (copie)${ext}`;
    const nomStockage = `${uuidv4()}-${nettoyerNom(nom)}`;
    const emplacement = path.join(dossierFichiers, nomStockage);
    fs.copyFileSync(source.emplacement, emplacement);
    copies.push({ ...source, id: uuidv4(), nom, nomStockage, emplacement, dateCreation: new Date(), favori: false });
  }
  if (!copies.length) return res.status(400).json({ erreur: 'Les fichiers source ne sont plus disponibles sur le stockage.' });
  global.fichiers.push(...copies); enregistrer();
  res.status(201).json({ succes: true, message: `${copies.length} copie(s) créée(s).`, fichiers: copies });
});

routeur.post('/compresser', verifierJeton, async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const sources = ids.map(id => trouverFichier(id, req.email)).filter(f => f && f.emplacement && fs.existsSync(f.emplacement));
  if (!sources.length) return res.status(400).json({ erreur: 'Aucun fichier disponible pour la compression.' });
  const id = uuidv4();
  const nom = `estock-selection-${new Date().toISOString().slice(0, 10)}.zip`;
  const nomStockage = `${id}-${nettoyerNom(nom)}`;
  const emplacement = path.join(dossierFichiers, nomStockage);
  await new Promise((resolve, reject) => { const sortie = fs.createWriteStream(emplacement); const archive = archiver('zip', { zlib: { level: 9 } }); sortie.on('close', resolve); archive.on('error', reject); archive.pipe(sortie); sources.forEach(source => archive.file(source.emplacement, { name: nettoyerNom(source.nom) })); archive.finalize(); });
  const fichier = { id, nomUtilisateur: req.email, nom, nomStockage, emplacement, type: 'archive', mimeType: 'application/zip', taille: fs.statSync(emplacement).size, dateCreation: new Date(), dossier: null, favori: false, partage: false };
  global.fichiers.push(fichier); enregistrer();
  res.status(201).json({ succes: true, fichier });
});

routeur.put('/:id', verifierJeton, (req, res) => {
  const fichier = trouverFichier(req.params.id, req.email);
  if (!fichier) return res.status(404).json({ erreur: 'Fichier non trouvé' });
  const { nom, favori, partage } = req.body;
  if (nom) fichier.nom = nettoyerNom(nom);
  if (favori !== undefined) fichier.favori = Boolean(favori);
  if (partage !== undefined) fichier.partage = Boolean(partage);
  enregistrer(); res.json({ succes: true, fichier });
});

routeur.delete('/:id', verifierJeton, (req, res) => {
  const index = global.fichiers.findIndex(f => String(f.id) === String(req.params.id) && f.nomUtilisateur === req.email);
  if (index === -1) return res.status(404).json({ erreur: 'Fichier non trouvé' });
  const fichier = global.fichiers[index];
  if (fichier.emplacement && fs.existsSync(fichier.emplacement)) fs.rmSync(fichier.emplacement, { force: true });
  global.fichiers.splice(index, 1); enregistrer(); res.json({ succes: true, message: 'Fichier supprimé', fichier });
});

routeur.get('/:id/telecharger', verifierJeton, (req, res) => {
  const fichier = trouverFichier(req.params.id, req.email);
  if (!fichier || !fichier.emplacement || !fs.existsSync(fichier.emplacement)) return res.status(404).json({ erreur: 'Fichier non disponible' });
  return res.download(fichier.emplacement, nettoyerNom(fichier.nom), erreur => { if (erreur && !res.headersSent) res.status(500).json({ erreur: 'Téléchargement impossible' }); });
});

export default routeur;
