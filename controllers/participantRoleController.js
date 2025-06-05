const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const participantRoleCreateSerializer = require('../serializers/participantRoleCreateSerializer');
const participantRoleResponseSerializer = require('../serializers/participantRoleResponseSerializer');
const participantRoleDetailResponseSerializer = require('../serializers/participantRoleDetailResponseSerializer');
const userResponseSerializer = require('../serializers/userResponseSerializer');

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
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
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
  try {
    // Liste des champs de tri valides
    const validSortFields = [
      'id',
      'referenceNumber',
      'name',
      'permissionList',
      'createdById',
      'updatedById',
      'isActive',
      'createdAt',
      'updatedAt'
    ];

    // Récupération des paramètres de pagination depuis la requête
    const page = parseInt(req.query.page) || 1;
    const requestedLimit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const requestedSortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order?.toUpperCase() === 'ASC' ? 'asc' : 'desc';

    // Récupération des paramètres de filtrage supplémentaires
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const createdById = req.query.createdById || undefined;
    const updatedById = req.query.updatedById || undefined;
    const permission = req.query.permission || undefined;

    // Validation du champ de tri
    const sortBy = validSortFields.includes(requestedSortBy) ? requestedSortBy : 'createdAt';

    if (requestedSortBy && !validSortFields.includes(requestedSortBy)) {
      console.warn(`Tentative de tri sur un champ invalide: ${requestedSortBy}. Utilisation de createdAt par défaut.`);
    }

    // Paramètres de filtrage par date
    const createdAtStart = req.query.createdAtStart ? new Date(req.query.createdAtStart) : null;
    const createdAtEnd = req.query.createdAtEnd ? new Date(req.query.createdAtEnd) : null;
    const updatedAtStart = req.query.updatedAtStart ? new Date(req.query.updatedAtStart) : null;
    const updatedAtEnd = req.query.updatedAtEnd ? new Date(req.query.updatedAtEnd) : null;
    const createdAt = req.query.createdAt ? new Date(req.query.createdAt) : null;
    const updatedAt = req.query.updatedAt ? new Date(req.query.updatedAt) : null;

    // Construction de la condition de recherche
    const whereCondition = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } }
      ],
      AND: []
    };

    // Ajout des filtres booléens et autres
    if (isActive !== undefined) whereCondition.isActive = isActive;
    if (createdById) whereCondition.createdById = createdById;
    if (updatedById) whereCondition.updatedById = updatedById;
    
    // Filtre sur les permissions si spécifié
    if (permission) {
      whereCondition.permissionList = {
        has: permission
      };
    }

    // Ajout des conditions de date si présentes
    if (createdAt) {
      whereCondition.AND.push({
        createdAt: {
          gte: createdAt,
          lt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000)
        }
      });
    } else if (createdAtStart || createdAtEnd) {
      whereCondition.AND.push({
        createdAt: {
          ...(createdAtStart && { gte: createdAtStart }),
          ...(createdAtEnd && { lte: createdAtEnd })
        }
      });
    }

    if (updatedAt) {
      whereCondition.AND.push({
        updatedAt: {
          gte: updatedAt,
          lt: new Date(updatedAt.getTime() + 24 * 60 * 60 * 1000)
        }
      });
    } else if (updatedAtStart || updatedAtEnd) {
      whereCondition.AND.push({
        updatedAt: {
          ...(updatedAtStart && { gte: updatedAtStart }),
          ...(updatedAtEnd && { lte: updatedAtEnd })
        }
      });
    }

    // Si aucune condition AND n'est ajoutée, supprimez le tableau AND
    if (whereCondition.AND.length === 0) {
      delete whereCondition.AND;
    }

    // Récupération du nombre total de rôles de participants
    const total = await prisma.participantRole.count({ where: whereCondition });

    // Protection contre les performances
    const MAX_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_FOR_UNLIMITED_QUERY) {
      return res.status(400).json({
        error: `La récupération de tous les rôles de participants est limitée à ${MAX_FOR_UNLIMITED_QUERY} entrées. Veuillez utiliser la pagination.`
      });
    }

    // Configuration de la requête
    const findManyOptions = {
      where: whereCondition,
      orderBy: {
        [sortBy]: order
      },
      include: {
        created: true,
        updated: true,
        participants: true
      }
    };

    // Ajouter la pagination seulement si limit n'est pas -1
    if (requestedLimit !== -1) {
      findManyOptions.skip = (page - 1) * requestedLimit;
      findManyOptions.take = requestedLimit;
    }

    // Récupération des rôles de participants
    const participantRoles = await prisma.participantRole.findMany(findManyOptions);

    // Formatage des rôles de participants avec les relations
    const formattedParticipantRoles = participantRoles.map(role => {
      const formattedRole = { ...role };
      if (role.created) {
        formattedRole.created = userResponseSerializer(role.created);
      }
      if (role.updated) {
        formattedRole.updated = userResponseSerializer(role.updated);
      }
      if (role.participants) {
        formattedRole.participants = role.participants.map(participant => userResponseSerializer(participant));
      }
      return participantRoleResponseSerializer(formattedRole);
    });

    // Préparation de la réponse
    const paginationData = requestedLimit === -1
      ? {
          total,
          page: null,
          limit: null,
          totalPages: null,
          hasNextPage: false,
          hasPreviousPage: false
        }
      : {
          total,
          page,
          limit: requestedLimit,
          totalPages: Math.ceil(total / requestedLimit),
          hasNextPage: page < Math.ceil(total / requestedLimit),
          hasPreviousPage: page > 1
        };

    return res.status(200).json({
      data: formattedParticipantRoles,
      pagination: paginationData,
      filters: {
        search,
        sortBy,
        order,
        dates: {
          createdAt,
          createdAtStart,
          createdAtEnd,
          updatedAt,
          updatedAtStart,
          updatedAtEnd
        },
        attributes: {
          isActive,
          permission,
          createdById,
          updatedById
        }
      },
      validSortFields
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des rôles de participants:', error);
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
      },
      include: {
        created: true,
        updated: true,
        participants: true,
    },
    });

    // Vérification de l'existence de la participantRole
    if (!participantRole) {
      return res.status(404).json({ error: 'participantRole non trouvé' });
    }
    if(participantRole.created){
      participantRole.created=userResponseSerializer(participantRole.created);
    }
    if(participantRole.updated){
      participantRole.updated=userResponseSerializer(participantRole.updated);
    }
    if(participantRole.participants){
      participantRole.participants=userResponseSerializer(participantRole.participants);
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
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    // Récupération de la participantRole mis à jour
    const participantRole = await prisma.participantRole.findUnique({
      where: {
        id: id,
      },
      include: {
        created: true,
        updated: true,
        participants: true,
    },
    });

    // Vérification de l'existence de la participantRole
    if (!participantRole) {
      return res.status(404).json({ error: 'participantRole non trouvé' });
    }
    if(participantRole.created){
      participantRole.created=userResponseSerializer(participantRole.created);
    }
    if(participantRole.updated){
      participantRole.updated=userResponseSerializer(participantRole.updated);
    }
    if(participantRole.participants){
      participantRole.participants=userResponseSerializer(participantRole.participants);
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
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
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
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
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