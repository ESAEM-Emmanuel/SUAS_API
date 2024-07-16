const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const userRoleCreateSerializer = require('../serializers/userRoleCreateSerializer');
const userRoleResponseSerializer = require('../serializers/userRoleResponseSerializer');
const userRoleDetailResponseSerializer = require('../serializers/userRoleDetailResponseSerializer');

// Fonction pour créer un nouvel userRole
exports.createUserRole = async (req, res) => {
    console.log("createuserRole");
  const { name, permissionList} = req.body;

  try {
    // Validation des données d'entrée
    const { error } = userRoleCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Vérification des contraintes d'unicité
    console.log(userRoleCreateSerializer.validate(req.body));
    const existinguserRole = await prisma.userRole.findUnique({ where: { name } });
    if (existinguserRole) {
      return res.status(400).json({ error: 'userRole already exists' });
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.userRole);
    console.log(referenceNumber);

    // Création de la userRole avec Prisma
    const newuserRole = await prisma.userRole.create({
      data: {
        name,
        permissionList,
        referenceNumber,
        isActive: true,
        createdById: req.userId,
      },
    });
    // Réponse avec la userRole créée
    return res.status(201).json(newuserRole);
  } catch (error) {
    console.error('Erreur lors de la création de la userRole :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

  // Fonction pour récupérer tous les userRoles avec pagination
  exports.getUserRoles = async (req, res) => {
    const { page = 1, limit = 100 } = req.query;
  
    try {
      const userRoles = await prisma.userRole.findMany({
        skip: (page - 1) * limit,
        take: parseInt(limit),
        where: {
          isActive: true,
        },
        orderBy: {
          name: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
        },
      });
  
      const formateduserRoles = userRoles.map(userRoleResponseSerializer);
      return res.status(200).json(formateduserRoles);
    } catch (error) {
      console.error('Erreur lors de la récupération des userRoles :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  // Fonction pour récupérer tous les userRoles avec pagination
  exports.getuserRolesInactifs = async (req, res) => {
    const { page = 1, limit = 100 } = req.query;
  
    try {
      const userRoles = await prisma.userRole.findMany({
        skip: (page - 1) * limit,
        take: parseInt(limit),
        where: {
          isActive: false,
        },
        orderBy: {
          name: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
        },
      });
  
      const formateduserRoles = userRoles.map(userRoleResponseSerializer);
      return res.status(200).json(formateduserRoles);
    } catch (error) {
      console.error('Erreur lors de la récupération des userRoles :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour récupérer une userRole par son ID
  exports.getUserRole = async (req, res) => {
    console.log("getuserRole ok");
    const { id } = req.params;
  
    try {
      const userRole = await prisma.userRole.findUnique({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        }
      });
  
      // Vérification de l'existence de la userRole
      if (!userRole) {
        return res.status(404).json({ error: 'userRole non trouvé' });
      }
  
      // Réponse avec la userRole trouvé
      return res.status(200).json(userRoleDetailResponseSerializer(userRole));
    } catch (error) {
      console.error('Erreur lors de la récupération de la userRole :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour mettre à jour une userRole
exports.updateUserRole = async (req, res) => {
  console.log("updateUserRole ok");
  console.log(req.userId);
  console.log(req.user);
  const { id } = req.params;
  const {
    name,
    permissionList, // Add permissionList here
  } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = userRoleCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Mise à jour de la userRole
    const updateduserRole = await prisma.userRole.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        name,
        permissionList,
        updatedById: req.userId,
      },
    });

    // Récupération de la userRole mis à jour
    const userRole = await prisma.userRole.findUnique({
      where: {
        id: id,
      }
    });

    if (!userRole) {
      return res.status(404).json({ error: 'userRole non trouvé' });
    }

    // Réponse avec la userRole trouvé
    return res.status(200).json(userRoleDetailResponseSerializer(userRole));
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la userRole :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};
  
  // Fonction pour supprimer une userRole
  exports.deleteUserRole = async (req, res) => {
    const { id } = req.params;
  
    try {
      // Mise à jour de la userRole pour une suppression douce
      const deleteduserRole = await prisma.userRole.update({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        data: {
          isActive: false,
          updatedById: req.userId,
        },
      });
  
      if (!deleteduserRole) {
        return res.status(404).json({ error: 'userRole non trouvé' });
      }
  
      // Réponse de suppression réussie
      return res.status(204).send();
    } catch (error) {
      console.error('Erreur lors de la suppression de la userRole :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour restorer une userRole
  exports.restoreUserRole = async (req, res) => {
    const { id } = req.params;
  
    try {
      // Vérification de l'existence de la userRole
      const restoreduserRole = await prisma.userRole.findUnique({
        where: { id: id },
      });
  
      if (!restoreduserRole) {
        return res.status(404).json({ error: 'userRole non trouvé' });
      }
  
      // Mise à jour de la userRole pour le restorer
      await prisma.userRole.update({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        data: {
          isActive: true,
          updatedById: req.userId,
        },
      });
  
      // Réponse de restauration réussie
      return res.status(200).send();
    } catch (error) {
      console.error('Erreur lors de la restauration de la userRole :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Export des fonctions du contrôleur
  module.exports = exports;