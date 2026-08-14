import jwt from 'jsonwebtoken';

export function verifierJeton(req, res, next) {
  const entete = req.headers.authorization || '';
  const jeton = entete.startsWith('Bearer ') ? entete.slice(7) : null;
  if (!jeton) return res.status(401).json({ erreur: 'Token manquant' });

  try {
    const charge = jwt.verify(jeton, process.env.JWT_SECRET);
    const utilisateur = global.utilisateurs.find(u => u.id === charge.id && u.email === charge.email);
    if (!utilisateur) return res.status(401).json({ erreur: 'Utilisateur non autorisé' });
    req.utilisateur = utilisateur;
    req.email = utilisateur.email;
    next();
  } catch {
    return res.status(401).json({ erreur: 'Token invalide ou expiré' });
  }
}
