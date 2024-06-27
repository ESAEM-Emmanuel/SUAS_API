const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");

// Fonction pour créer un nouvel utilisateur
exports.createUser = async (req, res) => {
  const {
    userName,
    email,
    password,
    name,
    photo,
    phone,
    gender,
    userRole,
    isAdmin,
    isStaff,
    isOwner,
    isActive,
  } = req.body;

  try {
    // Vérification des champs obligatoires
    console.log(userName, email, password, userRole);
    if (!userName || !email || !password || !userRole) {
      return res.status(400).json({ error: 'Les champs obligatoires doivent être renseignés: userName, email, password, userRole.' });
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.user);
    console.log(referenceNumber);

    // Hashage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création de l'utilisateur avec Prisma
    const newUser = await prisma.user.create({
      data: {
        userName,
        referenceNumber,
        email,
        password: hashedPassword,
        name,
        photo: photo || null,  // Ajoutez cette ligne
        phone,
        gender,
        userRole,
        isAdmin: isAdmin || false,
        isStaff: isStaff || false,
        isOwner: isOwner || false,
        isActive: isActive || true,
      },
    });

    // Réponse avec l'utilisateur créé
    return res.status(201).json(newUser);
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour gérer la connexion d'un utilisateur
exports.login = async (req, res) => {
  const { userName, password } = req.body;

  try {
    // Recherche de l'utilisateur par nom d'utilisateur
    const user = await prisma.user.findUnique({
      where: {
        userName,
      },
    });

    // Vérification de l'utilisateur
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérification du mot de passe
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Création du token JWT
    const token = jwt.sign(
      { userId: user.id, userName: user.userName },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Réponse avec le token JWT
    return res.status(200).json({ token });
  } catch (error) {
    console.error('Erreur lors de la connexion de l\'utilisateur :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer tous les utilisateurs
exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    return res.status(200).json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer un utilisateur par son ID
exports.getUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    // Vérification de l'existence de l'utilisateur
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Réponse avec l'utilisateur trouvé
    return res.status(200).json(user);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour mettre à jour un utilisateur
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { userName, email, phone } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: {
        id: parseInt(id),
      },
      data: {
        userName,
        email,
        phone,
      },
    });

    // Réponse avec l'utilisateur mis à jour
    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour supprimer un utilisateur
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({
      where: {
        id: parseInt(id),
      },
    });

    // Réponse de suppression réussie
    return res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Export des fonctions du contrôleur
module.exports = exports;