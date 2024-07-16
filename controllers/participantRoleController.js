const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const participantRoleCreateSerializer = require('../serializers/participantRoleCreateSerializer');
const participantRoleResponseSerializer = require('../serializers/participantRoleResponseSerializer');
const participantRoleDetailResponseSerializer = require('../serializers/participantRoleDetailResponseSerializer');

// Fonction pour créer un nouvel participantRole
exports.createParticipantRole = async (req, res) => {
    console.log("createparticipantRole");
  const { name, permissionList} = req.body;

  try {
    // Validation des données d'entrée
    const { error } = participantRoleCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Vérification des contraintes d'unicité
    console.log(participantRoleCreateSerializer.validate(req.body));
    const existingParticipantRole = await prisma.participantRole.findUnique({ where: { name } });
    if (existingParticipantRole) {
      return res.status(400).json({ error: 'participantRole already exists' });
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.participantRole);
    console.log(referenceNumber);

    // Création de la participantRole avec Prisma
    const newparticipantRole = await prisma.participantRole.create({
      data: {
        name,
        permissionList,
        referenceNumber,
        isActive: true,
        createdById: req.participantId,
      },
    });
    // Réponse avec la participantRole créée
    return res.status(201).json(newparticipantRole);
  } catch (error) {
    console.error('Erreur lors de la création de la participantRole :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

  // Fonction pour récupérer tous les participantRoles avec pagination
  exports.getParticipantRoles = async (req, res) => {
    const { page = 1, limit = 100 } = req.query;
  
    try {
      const participantRoles = await prisma.participantRole.findMany({
        skip: (page - 1) * limit,
        take: parseInt(limit),
        where: {
          isActive: true,
        },
        orderBy: {
          name: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
        },
      });
  
      const formatedparticipantRoles = participantRoles.map(participantRoleResponseSerializer);
      return res.status(200).json(formatedparticipantRoles);
    } catch (error) {
      console.error('Erreur lors de la récupération des participantRoles :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  // Fonction pour récupérer tous les participantRoles avec pagination
  exports.getParticipantRolesInactifs = async (req, res) => {
    const { page = 1, limit = 100 } = req.query;
  
    try {
      const participantRoles = await prisma.participantRole.findMany({
        skip: (page - 1) * limit,
        take: parseInt(limit),
        where: {
          isActive: false,
        },
        orderBy: {
          name: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
        },
      });
  
      const formatedparticipantRoles = participantRoles.map(participantRoleResponseSerializer);
      return res.status(200).json(formatedparticipantRoles);
    } catch (error) {
      console.error('Erreur lors de la récupération des participantRoles :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour récupérer une participantRole par son ID
  exports.getParticipantRole = async (req, res) => {
    console.log("getparticipantRole ok");
    const { id } = req.params;
  
    try {
      const participantRole = await prisma.participantRole.findUnique({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        }
      });
  
      // Vérification de l'existence de la participantRole
      if (!participantRole) {
        return res.status(404).json({ error: 'participantRole non trouvé' });
      }
  
      // Réponse avec la participantRole trouvé
      return res.status(200).json(participantRoleDetailResponseSerializer(participantRole));
    } catch (error) {
      console.error('Erreur lors de la récupération de la participantRole :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour mettre à jour une participantRole
exports.updateParticipantRole = async (req, res) => {
  console.log("updateparticipantRole ok");
  console.log(req.participantId);
  console.log(req.participant);
  const { id } = req.params;
  const {
    name,
    permissionList, // Add permissionList here
  } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = participantRoleCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Mise à jour de la participantRole
    const updatedparticipantRole = await prisma.participantRole.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        name,
        permissionList,
        updatedById: req.participantId,
      },
    });

    // Récupération de la participantRole mis à jour
    const participantRole = await prisma.participantRole.findUnique({
      where: {
        id: id,
      }
    });

    if (!participantRole) {
      return res.status(404).json({ error: 'participantRole non trouvé' });
    }

    // Réponse avec la participantRole trouvé
    return res.status(200).json(participantRoleDetailResponseSerializer(participantRole));
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la participantRole :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};
  
  // Fonction pour supprimer une participantRole
  exports.deleteParticipantRole = async (req, res) => {
    const { id } = req.params;
  
    try {
      // Mise à jour de la participantRole pour une suppression douce
      const deletedParticipantRole = await prisma.participantRole.update({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        data: {
          isActive: false,
          updatedById: req.participantId,
        },
      });
  
      if (!deletedParticipantRole) {
        return res.status(404).json({ error: 'participantRole non trouvé' });
      }
  
      // Réponse de suppression réussie
      return res.status(204).send();
    } catch (error) {
      console.error('Erreur lors de la suppression de la participantRole :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour restorer une participantRole
  exports.restoreParticipantRole = async (req, res) => {
    const { id } = req.params;
  
    try {
      // Vérification de l'existence de la participantRole
      const restoredParticipantRole = await prisma.participantRole.findUnique({
        where: { id: id },
      });
  
      if (!restoredParticipantRole) {
        return res.status(404).json({ error: 'participantRole non trouvé' });
      }
  
      // Mise à jour de la participantRole pour le restorer
      await prisma.participantRole.update({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        data: {
          isActive: true,
          updatedById: req.participantId,
        },
      });
  
      // Réponse de restauration réussie
      return res.status(200).send();
    } catch (error) {
      console.error('Erreur lors de la restauration de la participantRole :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Export des fonctions du contrôleur
  module.exports = exports;