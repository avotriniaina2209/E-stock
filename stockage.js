import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dossierDonnees = path.join(__dirname, 'donnees');
const fichierDonnees = path.join(dossierDonnees, 'stockage.json');

const normaliserDates = valeur => {
  if (valeur instanceof Date) return valeur.toISOString();
  if (!valeur || typeof valeur !== 'object') return valeur;
  if (Array.isArray(valeur)) return valeur.map(normaliserDates);
  return Object.fromEntries(Object.entries(valeur).map(([cle, contenu]) => [cle, normaliserDates(contenu)]));
};

function reparerDates(valeur, cle = '') {
  if (Array.isArray(valeur)) return valeur.map(item => reparerDates(item));
  if (!valeur || typeof valeur !== 'object') {
    if (cle === 'dateCreation' && (!valeur || Number.isNaN(Date.parse(String(valeur))))) return new Date().toISOString();
    return valeur;
  }
  return Object.fromEntries(Object.entries(valeur).map(([nom, contenu]) => [nom, reparerDates(contenu, nom)]));
}

function lireStockage() {
  try {
    const brut = fs.readFileSync(fichierDonnees, 'utf8');
    const donnees = reparerDates(JSON.parse(brut));
    return { utilisateurs: donnees.utilisateurs || [], fichiers: donnees.fichiers || [], dossiers: donnees.dossiers || [] };
  } catch {
    return { utilisateurs: [], fichiers: [], dossiers: [] };
  }
}

export const stockage = lireStockage();

global.utilisateurs = stockage.utilisateurs;
global.fichiers = stockage.fichiers;
global.dossiers = stockage.dossiers;

export function sauvegarder() {
  fs.mkdirSync(dossierDonnees, { recursive: true });
  const temporaire = `${fichierDonnees}.tmp`;
  fs.writeFileSync(temporaire, JSON.stringify(normaliserDates(stockage), null, 2), 'utf8');
  fs.renameSync(temporaire, fichierDonnees);
}

export function cheminDonnees() {
  return fichierDonnees;
}
