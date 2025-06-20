const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const eventParticipantRoleCreateSerializer = require('../serializers/eventParticipantRoleCreateSerializer');
const eventParticipantRoleResponseSerializer = require('../serializers/eventParticipantRoleResponseSerializer');
const eventparticipantRoleDetailResponseSerializer = require('../serializers/eventParticipantRoleDetailResponseSerializer');
const userResponseSerializer = require('../serializers/userResponseSerializer');
const ResponseHandler = require('../utils/responseHandler');

// Fonction pour créer un nouvel participantRole
exports.createParticipantRole = async (req, res) => {
  const { name, permissionList } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = eventParticipantRoleCreateSerializer.validate(req.body);
    if (error) {
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // Vérification des contraintes d'unicité
    const existingParticipantRole = await prisma.eventParticipantRole.findUnique({ where: { name } });
    if (existingParticipantRole) {
      return ResponseHandler.error(res, 'Ce rôle de participant existe déjà', 'CONFLICT');
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.eventParticipantRole);

    // Création du rôle de participant avec Prisma
    const newParticipantRole = await prisma.eventParticipantRole.create({
      data: {
        name,
        permissionList,
        referenceNumber,
        isActive: true,
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.success(res, eventParticipantRoleResponseSerializer(newParticipantRole), 'CREATED');
  } catch (error) {
    console.error('Erreur lors de la création du rôle de participant:', error);
    return ResponseHandler.error(res, 'Erreur lors de la création du rôle de participant');
  }
};

// Fonction pour récupérer tous les participantRoles avec pagination
exports.getParticipantRoles = async (req, res) => {
  try {
    const validSortFields = [
      'id', 'referenceNumber', 'name', 'permissionList', 'createdById',
      'updatedById', 'isActive', 'createdAt', 'updatedAt'
    ];

    // Récupération des paramètres de pagination depuis la requête
    const page = parseInt(req.query.page) || 1;
    const requestedLimit = parseInt(req.query.limit) || 100;
    const search = req.query.search || '';
    const requestedSortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order?.toUpperCase() === 'ASC' ? 'asc' : 'desc';

    // Validation du champ de tri
    const sortBy = validSortFields.includes(requestedSortBy) ? requestedSortBy : 'createdAt';

    if (requestedSortBy && !validSortFields.includes(requestedSortBy)) {
      console.warn(`Tentative de tri sur un champ invalide: ${requestedSortBy}. Utilisation de createdAt par défaut.`);
    }

    // Construction des conditions de recherche et de filtrage
    const whereCondition = buildWhereCondition(req.query);

    // Récupération du nombre total de rôles de participants
    const total = await prisma.eventParticipantRole.count({ where: whereCondition });

    // Protection contre les performances
    const MAX_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_FOR_UNLIMITED_QUERY) {
      return ResponseHandler.error(
        res,
        `La récupération de tous les rôles de participants est limitée à ${MAX_FOR_UNLIMITED_QUERY} entrées. Veuillez utiliser la pagination.`,
        'BAD_REQUEST'
      );
    }

    // Configuration de la requête
    const findManyOptions = {
      where: whereCondition,
      orderBy: { [sortBy]: order },
      include: {
        created: true,
        updated: true,
        eventParticipants: true
      }
    };

    // Ajouter la pagination seulement si limit n'est pas -1
    if (requestedLimit !== -1) {
      findManyOptions.skip = (page - 1) * requestedLimit;
      findManyOptions.take = requestedLimit;
    }

    // Récupération des rôles de participants
    const participantRoles = await prisma.eventParticipantRole.findMany(findManyOptions);

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
      return eventParticipantRoleResponseSerializer(formattedRole);
    });

    // Préparation de la réponse
    const response = {
      data: formattedParticipantRoles,
      pagination: buildPaginationData(total, page, requestedLimit),
      filters: buildFiltersData(req.query, sortBy, order),
      validSortFields
    };

    return ResponseHandler.success(res, response);
  } catch (error) {
    console.error('Erreur lors de la récupération des rôles de participants:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des rôles de participants');
  }
};

// Fonction pour récupérer tous les participantRoles avec pagination
exports.getParticipantRolesInactifs = async (req, res) => {
  const { page = 1, limit = 100 } = req.query;

  try {
    const participantRoles = await prisma.eventParticipantRole.findMany({
      skip: (page - 1) * limit,
      take: parseInt(limit),
      where: { isActive: false },
      orderBy: { name: 'asc' },
    });

    const formattedParticipantRoles = participantRoles.map(eventParticipantRoleResponseSerializer);
    return ResponseHandler.success(res, formattedParticipantRoles);
  } catch (error) {
    console.error('Erreur lors de la récupération des rôles de participants inactifs:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des rôles de participants inactifs');
  }
};

// Fonction pour récupérer une participantRole par son ID
exports.getParticipantRole = async (req, res) => {
  const { id } = req.params;

  try {
    const participantRole = await prisma.eventParticipantRole.findUnique({
      where: { id },
      include: {
        created: true,
        updated: true,
        eventParticipants: true,
      },
    });

    if (!participantRole) {
      return ResponseHandler.error(res, 'Rôle de participant non trouvé', 'NOT_FOUND');
    }

    // Formatage des relations
    if (participantRole.created) {
      participantRole.created = userResponseSerializer(participantRole.created);
    }
    if (participantRole.updated) {
      participantRole.updated = userResponseSerializer(participantRole.updated);
    }
    if (participantRole.participants) {
      participantRole.participants = participantRole.participants.map(participant => userResponseSerializer(participant));
    }

    return ResponseHandler.success(res, eventparticipantRoleDetailResponseSerializer(participantRole));
  } catch (error) {
    console.error('Erreur lors de la récupération du rôle de participant:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération du rôle de participant');
  }
};

// Fonction pour mettre à jour une participantRole
exports.updateParticipantRole = async (req, res) => {
  const { id } = req.params;
  const { name, permissionList } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = eventParticipantRoleCreateSerializer.validate(req.body);
    if (error) {
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // Mise à jour du rôle de participant
    await prisma.eventParticipantRole.update({
      where: { id },
      data: {
        name,
        permissionList,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    // Récupération du rôle de participant mis à jour
    const participantRole = await prisma.eventParticipantRole.findUnique({
      where: { id },
      include: {
        created: true,
        updated: true,
        eventParticipants: true,
      },
    });

    if (!participantRole) {
      return ResponseHandler.error(res, 'Rôle de participant non trouvé', 'NOT_FOUND');
    }

    // Formatage des relations
    if (participantRole.created) {
      participantRole.created = userResponseSerializer(participantRole.created);
    }
    if (participantRole.updated) {
      participantRole.updated = userResponseSerializer(participantRole.updated);
    }
    if (participantRole.participants) {
      participantRole.participants = participantRole.participants.map(participant => userResponseSerializer(participant));
    }

    return ResponseHandler.success(res, eventparticipantRoleDetailResponseSerializer(participantRole));
  } catch (error) {
    console.error('Erreur lors de la mise à jour du rôle de participant:', error);
    return ResponseHandler.error(res, 'Erreur lors de la mise à jour du rôle de participant');
  }
};

// Fonction pour supprimer une participantRole
exports.deleteParticipantRole = async (req, res) => {
  const { id } = req.params;

  try {
    const participantRole = await prisma.eventParticipantRole.findUnique({
      where: {
        id,
        isActive: true
      },
    });

    if (!participantRole) {
      return ResponseHandler.error(res, 'Rôle de participant non trouvé', 'NOT_FOUND');
    }

    await prisma.eventParticipantRole.update({
      where: { id },
      data: {
        isActive: false,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.noContent(res);
  } catch (error) {
    console.error('Erreur lors de la suppression du rôle de participant:', error);
    return ResponseHandler.error(res, 'Erreur lors de la suppression du rôle de participant');
  }
};

// Fonction pour restorer une participantRole
exports.restoreParticipantRole = async (req, res) => {
  const { id } = req.params;

  try {
    const participantRole = await prisma.eventParticipantRole.findUnique({
      where: {
        id,
        isActive: false
      },
    });

    if (!participantRole) {
      return ResponseHandler.error(res, 'Rôle de participant non trouvé', 'NOT_FOUND');
    }

    await prisma.eventParticipantRole.update({
      where: { id },
      data: {
        isActive: true,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.success(res, null, 'OK');
  } catch (error) {
    console.error('Erreur lors de la restauration du rôle de participant:', error);
    return ResponseHandler.error(res, 'Erreur lors de la restauration du rôle de participant');
  }
};

// Fonctions utilitaires
function buildWhereCondition(query) {
  const {
    search = '',
    isActive,
    createdById,
    updatedById,
    permission
  } = query;

  const whereCondition = {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { referenceNumber: { contains: search, mode: 'insensitive' } }
    ],
    AND: []
  };

  // Ajout des filtres booléens et autres
  if (isActive !== undefined) whereCondition.isActive = isActive === 'true';
  if (createdById) whereCondition.createdById = createdById;
  if (updatedById) whereCondition.updatedById = updatedById;
  if (permission) {
    whereCondition.permissionList = {
      has: permission
    };
  }

  // Gestion des dates
  addDateConditions(whereCondition, query);

  if (whereCondition.AND.length === 0) {
    delete whereCondition.AND;
  }

  return whereCondition;
}

function addDateConditions(whereCondition, query) {
  const {
    createdAt,
    updatedAt,
    createdAtStart,
    createdAtEnd,
    updatedAtStart,
    updatedAtEnd
  } = query;

  if (createdAt) {
    const startOfDay = new Date(createdAt);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    whereCondition.AND.push({
      createdAt: {
        gte: startOfDay,
        lt: endOfDay
      }
    });
  } else if (createdAtStart || createdAtEnd) {
    whereCondition.AND.push({
      createdAt: {
        ...(createdAtStart && { gte: new Date(createdAtStart) }),
        ...(createdAtEnd && { lte: new Date(createdAtEnd) })
      }
    });
  }

  if (updatedAt) {
    const startOfDay = new Date(updatedAt);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    whereCondition.AND.push({
      updatedAt: {
        gte: startOfDay,
        lt: endOfDay
      }
    });
  } else if (updatedAtStart || updatedAtEnd) {
    whereCondition.AND.push({
      updatedAt: {
        ...(updatedAtStart && { gte: new Date(updatedAtStart) }),
        ...(updatedAtEnd && { lte: new Date(updatedAtEnd) })
      }
    });
  }
}

function buildPaginationData(total, page, limit) {
  if (limit === -1) {
    return {
      total,
      page: null,
      limit: null,
      totalPages: null,
      hasNextPage: false,
      hasPreviousPage: false
    };
  }

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPreviousPage: page > 1
  };
}

function buildFiltersData(query, sortBy, order) {
  const {
    search,
    createdAt,
    createdAtStart,
    createdAtEnd,
    updatedAt,
    updatedAtStart,
    updatedAtEnd,
    isActive,
    createdById,
    updatedById,
    permission
  } = query;

  return {
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
  };
}

// Export des fonctions du contrôleur
module.exports = exports;