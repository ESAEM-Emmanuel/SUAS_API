const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const permissionCreateSerializer = require('../serializers/permissionCreateSerializer');
const permissionResponseSerializer = require('../serializers/permissionResponseSerializer');
const permissionDetailResponseSerializer = require('../serializers/permissionDetailResponseSerializer');

// Fonction pour créer un nouvel Permission
exports.createPermission = async (req, res) => {
  const { name} = req.body;

  try {
    // Validation des données d'entrée
    const { error } = permissionCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Vérification des contraintes d'unicité
    const existingPermission = await prisma.permission.findUnique({ where: { name } });
    if (existingPermission) {
      return res.status(400).json({ error: 'Permission already exists' });
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.permission);
    console.log(referenceNumber);

    // Création de la permission avec Prisma
    const newPermission = await prisma.permission.create({
      data: {
        name,
        referenceNumber,
        isActive: true,
        createdById: req.userId,
      },
    });
    // Réponse avec la permission créée
    const formattedPermission = permissionResponseSerializer(newPermission);
    return res.status(201).json(formattedPermission);
  } catch (error) {
    console.error('Erreur lors de la création de la permission :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

  
  
  // Fonction pour récupérer tous les permissions avec pagination
  exports.getPermissions = async (req, res) => {
    const { page = 1, limit = 100 } = req.query;
  
    try {
      const permissions = await prisma.permission.findMany({
        skip: (page - 1) * limit,
        take: parseInt(limit),
        where: {
          isActive: true,
        },
        orderBy: {
          name: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
        },
      });
  
      const formatedPermissions = permissions.map(permissionResponseSerializer);
      return res.status(200).json(formatedPermissions);
    } catch (error) {
      console.error('Erreur lors de la récupération des Permissions :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  // Fonction pour récupérer tous les permissions avec pagination
  exports.getPermissionsInactifs = async (req, res) => {
    const { page = 1, limit = 100 } = req.query;
  
    try {
      const permissions = await prisma.permission.findMany({
        skip: (page - 1) * limit,
        take: parseInt(limit),
        where: {
          isActive: false,
        },
        orderBy: {
          name: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
        },
      });
  
      const formatedPermissions = permissions.map(permissionResponseSerializer);
      return res.status(200).json(formatedPermissions);
    } catch (error) {
      console.error('Erreur lors de la récupération des Permissions :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour récupérer une permission par son ID
  exports.getPermission = async (req, res) => {
    console.log("getpermission ok");
    const { id } = req.params;
  
    try {
      const permission = await prisma.permission.findUnique({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        }
      });
  
      // Vérification de l'existence de la permission
      if (!permission) {
        return res.status(404).json({ error: 'Permission non trouvé' });
      }
  
      // Réponse avec la permission trouvé
      return res.status(200).json(permissionDetailResponseSerializer(permission));
    } catch (error) {
      console.error('Erreur lors de la récupération de la permission :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour mettre à jour une permission
  exports.updatePermission = async (req, res) => {
    const { id } = req.params;
    const {
      name,
      
    } = req.body;
  
    try {
      // Validation des données d'entrée
      const { error } = permissionCreateSerializer.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
  
      // Mise à jour de la permission
      const updatedPermission = await prisma.permission.update({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        data: {
          name,
          updatedById: req.userId,
        },
      });
  
      // Récupération de la permission mis à jour
      const permission = await prisma.permission.findUnique({
        where: {
          id: id,
        }
      });
  
      if (!permission) {
        return res.status(404).json({ error: 'Permission non trouvé' });
      }
  
      // Réponse avec la permission trouvé
      return res.status(200).json(permissionDetailResponseSerializer(permission));
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la permission :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour supprimer une permission
  exports.deletePermission = async (req, res) => {
    const { id } = req.params;
    // Recherche de l'permission par nom d'permission
    const queryPermission = await prisma.permission.findUnique({
      where: {
        id:id,
        isActive:true
      },
    });

    // Vérification de l'permission
    if (!queryPermission) {
      return res.status(404).json({ error: 'Permission non trouvé' });
    }
  
    try {
      // Mise à jour de la permission pour une suppression douce
      const deletedPermission = await prisma.permission.update({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        data: {
          isActive: false,
          updatedById: req.userId,
        },
      });
  
      if (!deletedPermission) {
        return res.status(404).json({ error: 'Permission non trouvé' });
      }
  
      // Réponse de suppression réussie
      return res.status(204).send();
    } catch (error) {
      console.error('Erreur lors de la suppression de la permission :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour restorer une permission
  exports.restorePermission = async (req, res) => {
    const { id } = req.params;

    // Recherche de l'permission par nom d'permission
    const queryPermission = await prisma.permission.findUnique({
      where: {
        id:id,
        isActive:false
      },
    });

    // Vérification de l'permission
    if (!queryPermission) {
      return res.status(404).json({ error: 'Permission non trouvé' });
    }
  
    try {
      // Vérification de l'existence de la permission
      const restoredPermission = await prisma.permission.findUnique({
        where: { id: id },
      });
  
      if (!restoredPermission) {
        return res.status(404).json({ error: 'Permission non trouvé' });
      }
  
      // Mise à jour de la permission pour le restorer
      await prisma.permission.update({
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
      console.error('Erreur lors de la restauration de la permission :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Export des fonctions du contrôleur
  module.exports = exports;