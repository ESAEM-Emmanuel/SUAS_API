const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const permissionCreateSerializer = require('../serializers/permissionCreateSerializer');
const permissionResponseSerializer = require('../serializers/permissionResponseSerializer');
const permissionDetailResponseSerializer = require('../serializers/permissionDetailResponseSerializer');
const userResponseSerializer = require('../serializers/userResponseSerializer');
const ResponseHandler = require('../utils/responseHandler');

// Fonction pour créer un nouvel Permission
exports.createPermission = async (req, res) => {
  const { name } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = permissionCreateSerializer.validate(req.body);
    if (error) {
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // Vérification des contraintes d'unicité
    const existingPermission = await prisma.permission.findUnique({ where: { name } });
    if (existingPermission) {
      return ResponseHandler.error(res, 'Cette permission existe déjà', 'CONFLICT');
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.permission);

    // Création de la permission avec Prisma
    const newPermission = await prisma.permission.create({
      data: {
        name,
        referenceNumber,
        isActive: true,
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.success(res, permissionResponseSerializer(newPermission), 'CREATED');
  } catch (error) {
    console.error('Erreur lors de la création de la permission:', error);
    return ResponseHandler.error(res, 'Erreur lors de la création de la permission');
  }
};

// Fonction pour récupérer tous les permissions avec pagination
exports.getPermissions = async (req, res) => {
  try {
    const validSortFields = [
      'id', 'referenceNumber', 'name', 'createdById',
      'updatedById', 'isActive', 'createdAt', 'updatedAt'
    ];

    // Récupération des paramètres de pagination depuis la requête
    const page = parseInt(req.query.page) || 1;
    const requestedLimit = parseInt(req.query.limit) || 10;
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

    // Récupération du nombre total de permissions
    const total = await prisma.permission.count({ where: whereCondition });

    // Protection contre les performances
    const MAX_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_FOR_UNLIMITED_QUERY) {
      return ResponseHandler.error(
        res,
        `La récupération de toutes les permissions est limitée à ${MAX_FOR_UNLIMITED_QUERY} entrées. Veuillez utiliser la pagination.`,
        'BAD_REQUEST'
      );
    }

    // Configuration de la requête
    const findManyOptions = {
      where: whereCondition,
      orderBy: { [sortBy]: order },
      include: {
        created: true,
        updated: true
      }
    };

    // Ajouter la pagination seulement si limit n'est pas -1
    if (requestedLimit !== -1) {
      findManyOptions.skip = (page - 1) * requestedLimit;
      findManyOptions.take = requestedLimit;
    }

    // Récupération des permissions
    const permissions = await prisma.permission.findMany(findManyOptions);

    // Formatage des permissions avec les relations
    const formattedPermissions = permissions.map(permission => {
      const formattedPermission = { ...permission };
      if (permission.created) {
        formattedPermission.created = userResponseSerializer(permission.created);
      }
      if (permission.updated) {
        formattedPermission.updated = userResponseSerializer(permission.updated);
      }
      return permissionResponseSerializer(formattedPermission);
    });

    // Préparation de la réponse
    const response = {
      data: formattedPermissions,
      pagination: buildPaginationData(total, page, requestedLimit),
      filters: buildFiltersData(req.query, sortBy, order),
      validSortFields
    };

    return ResponseHandler.success(res, response);
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des permissions');
  }
};

// Fonction pour récupérer tous les permissions avec pagination
exports.getPermissionsInactifs = async (req, res) => {
  const { page = 1, limit = 100 } = req.query;

  try {
    const permissions = await prisma.permission.findMany({
      skip: (page - 1) * limit,
      take: parseInt(limit),
      where: { isActive: false },
      orderBy: { name: 'asc' },
    });

    const formattedPermissions = permissions.map(permissionResponseSerializer);
    return ResponseHandler.success(res, formattedPermissions);
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions inactives:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des permissions inactives');
  }
};

// Fonction pour récupérer une permission par son ID
exports.getPermission = async (req, res) => {
  const { id } = req.params;

  try {
    const permission = await prisma.permission.findUnique({
      where: { id },
      include: {
        created: true,
        updated: true,
      },
    });

    if (!permission) {
      return ResponseHandler.error(res, 'Permission non trouvée', 'NOT_FOUND');
    }

    // Formatage des relations
    if (permission.created) {
      permission.created = userResponseSerializer(permission.created);
    }
    if (permission.updated) {
      permission.updated = userResponseSerializer(permission.updated);
    }

    return ResponseHandler.success(res, permissionDetailResponseSerializer(permission));
  } catch (error) {
    console.error('Erreur lors de la récupération de la permission:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération de la permission');
  }
};

// Fonction pour mettre à jour une permission
exports.updatePermission = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = permissionCreateSerializer.validate(req.body);
    if (error) {
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // Mise à jour de la permission
    await prisma.permission.update({
      where: { id },
      data: {
        name,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    // Récupération de la permission mise à jour
    const permission = await prisma.permission.findUnique({
      where: { id },
      include: {
        created: true,
        updated: true,
      },
    });

    if (!permission) {
      return ResponseHandler.error(res, 'Permission non trouvée', 'NOT_FOUND');
    }

    // Formatage des relations
    if (permission.created) {
      permission.created = userResponseSerializer(permission.created);
    }
    if (permission.updated) {
      permission.updated = userResponseSerializer(permission.updated);
    }

    return ResponseHandler.success(res, permissionDetailResponseSerializer(permission));
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la permission:', error);
    return ResponseHandler.error(res, 'Erreur lors de la mise à jour de la permission');
  }
};

// Fonction pour supprimer une permission
exports.deletePermission = async (req, res) => {
  const { id } = req.params;

  try {
    const permission = await prisma.permission.findUnique({
      where: {
        id,
        isActive: true
      },
    });

    if (!permission) {
      return ResponseHandler.error(res, 'Permission non trouvée', 'NOT_FOUND');
    }

    await prisma.permission.update({
      where: { id },
      data: {
        isActive: false,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.noContent(res);
  } catch (error) {
    console.error('Erreur lors de la suppression de la permission:', error);
    return ResponseHandler.error(res, 'Erreur lors de la suppression de la permission');
  }
};

// Fonction pour restorer une permission
exports.restorePermission = async (req, res) => {
  const { id } = req.params;

  try {
    const permission = await prisma.permission.findUnique({
      where: {
        id,
        isActive: false
      },
    });

    if (!permission) {
      return ResponseHandler.error(res, 'Permission non trouvée', 'NOT_FOUND');
    }

    await prisma.permission.update({
      where: { id },
      data: {
        isActive: true,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.success(res, null, 'OK');
  } catch (error) {
    console.error('Erreur lors de la restauration de la permission:', error);
    return ResponseHandler.error(res, 'Erreur lors de la restauration de la permission');
  }
};

// Fonctions utilitaires
function buildWhereCondition(query) {
  const {
    search = '',
    isActive,
    createdById,
    updatedById
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
    updatedById
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
      createdById,
      updatedById
    }
  };
}

// Export des fonctions du contrôleur
module.exports = exports;