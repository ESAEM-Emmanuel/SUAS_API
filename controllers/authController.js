const jwt = require('jsonwebtoken'); // Module pour générer et vérifier les JWT (JSON Web Tokens)
const bcrypt = require('bcryptjs'); // Module pour le hachage des mots de passe
const PrismaClient = require('@prisma/client').PrismaClient; // Prisma Client pour interagir avec la base de données
const prisma = new PrismaClient(); // Instance de Prisma Client pour exécuter des requêtes

// Fonction pour générer un token JWT à partir des informations de l'utilisateur
const generateToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: '366d', // Le token expirera après 30 jours
  });
};

// Fonction pour gérer la connexion de l'utilisateur
exports.login = async (req, res) => {
  const { username, password } = req.body; // Extraction des données de la requête

  try {
    // Recherche de l'utilisateur dans la base de données par son nom d'utilisateur
    const user = await prisma.user.findUnique({ where: { name: username } });

    // Vérification si l'utilisateur existe
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' }); // Retourne une erreur si l'utilisateur n'existe pas
    }

    // Vérification si le mot de passe fourni correspond au mot de passe haché enregistré
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Invalid credentials' }); // Retourne une erreur si le mot de passe est incorrect
    }

    // Génération d'un token JWT valide pour l'utilisateur authentifié
    const token = generateToken(user);

    // Retourne le token JWT dans la réponse en cas de succès de l'authentification
    return res.status(200).json({ token });
  } catch (error) {
    // Gestion des erreurs - retourne une erreur interne du serveur avec un message détaillé
    return res.status(500).json({ message: error.message });
  }
};