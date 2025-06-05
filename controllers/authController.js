const jwt = require('jsonwebtoken'); // Module pour générer et vérifier les JWT (JSON Web Tokens)
const bcrypt = require('bcryptjs'); // Module pour le hachage des mots de passe
const PrismaClient = require('@prisma/client').PrismaClient; // Prisma Client pour interagir avec la base de données
const prisma = new PrismaClient(); // Instance de Prisma Client pour exécuter des requêtes
const ResponseHandler = require('../utils/responseHandler');

// Fonction pour générer un token JWT à partir des informations de l'utilisateur
const generateToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: '366d', // Le token expirera après 366 jours
  });
};

// Fonction pour gérer la connexion de l'utilisateur
exports.login = async (req, res) => {
  console.log('Endpoint: POST /users/login');
  console.log('Request Body:', { username: req.body.username, password: '********' });

  const { username, password } = req.body; // Extraction des données de la requête

  try {
    // Recherche de l'utilisateur dans la base de données par son nom d'utilisateur
    const user = await prisma.user.findUnique({ where: { name: username } });

    // Vérification si l'utilisateur existe
    if (!user) {
      console.log('Authentication failed: User not found -', username);
      return ResponseHandler.error(res, 'Identifiants invalides', 'UN_AUTHORIZED');
    }

    // Vérification si le mot de passe fourni correspond au mot de passe haché enregistré
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log('Authentication failed: Invalid password for user -', username);
      return ResponseHandler.error(res, 'Identifiants invalides', 'UN_AUTHORIZED');
    }

    // Génération d'un token JWT valide pour l'utilisateur authentifié
    const token = generateToken(user);

    console.log('Authentication successful for user:', username);
    // Retourne le token JWT dans la réponse en cas de succès de l'authentification
    return ResponseHandler.success(res, { token });
  } catch (error) {
    console.error('Error during authentication:', error);
    return ResponseHandler.error(res, 'Une erreur est survenue lors de la connexion');
  }
};