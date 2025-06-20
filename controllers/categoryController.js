const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const categoryCreateSerializer = require('../serializers/categoryCreateSerializer');
const categoryResponseSerializer = require('../serializers/categoryResponseSerializer');
const categoryDetailResponseSerializer = require('../serializers/categoryDetailResponseSerializer');
const userResponseSerializer = require('../serializers/userResponseSerializer');
const ResponseHandler = require('../utils/responseHandler');

// Fonction pour créer une nouvelle catégorie
exports.createCategory = async (req, res) => {
  const { name } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = categoryCreateSerializer.validate(req.body);
    if (error) {
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // Vérification des contraintes d'unicité
    const existingCategory = await prisma.category.findUnique({ where: { name } });
    if (existingCategory) {
      return ResponseHandler.error(res, 'Cette catégorie existe déjà', 'CONFLICT');
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.category);

    // Création de la catégorie avec Prisma
    const newCategory = await prisma.category.create({
      data: {
        name,
        referenceNumber,
        isActive: true,
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
      },
    });

    const formattedCategory = categoryResponseSerializer(newCategory);
    return ResponseHandler.success(res, formattedCategory, 'CREATED');
  } catch (error) {
    console.error('Erreur lors de la création de la catégorie:', error);
    return ResponseHandler.error(res, 'Erreur lors de la création de la catégorie');
  }
};

// Fonction pour récupérer toutes les catégories avec pagination
exports.getCategories = async (req, res) => {
  try {
    // Liste des champs de tri valides
    const validSortFields = [
      'id', 'referenceNumber', 'name', 'description', 'photo',
      'createdById', 'updatedById', 'isActive', 'createdAt', 'updatedAt'
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

    // Récupération du nombre total de catégories
    const total = await prisma.category.count({ where: whereCondition });

    // Protection contre les performances
    const MAX_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_FOR_UNLIMITED_QUERY) {
      return ResponseHandler.error(
        res,
        `La récupération de toutes les catégories est limitée à ${MAX_FOR_UNLIMITED_QUERY} entrées. Veuillez utiliser la pagination.`,
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
        events: true
      }
    };

    // Ajouter la pagination seulement si limit n'est pas -1
    if (requestedLimit !== -1) {
      findManyOptions.skip = (page - 1) * requestedLimit;
      findManyOptions.take = requestedLimit;
    }

    // Récupération des catégories
    const categories = await prisma.category.findMany(findManyOptions);

    // Formatage des catégories
    const formattedCategories = formatCategories(categories);

    // Préparation de la réponse
    const response = {
      data: formattedCategories,
      pagination: buildPaginationData(total, page, requestedLimit),
      filters: buildFiltersData(req.query, sortBy, order),
      validSortFields
    };

    return ResponseHandler.success(res, response);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des catégories');
  }
};

// Fonction pour récupérer toutes les catégories inactives
exports.getCategoriesInactifs = async (req, res) => {
  const { page = 1, limit = 100 } = req.query;

  try {
    const categories = await prisma.category.findMany({
      skip: (page - 1) * limit,
      take: parseInt(limit),
      where: { isActive: false },
      orderBy: { name: 'asc' },
    });

    const formattedCategories = categories.map(categoryResponseSerializer);
    return ResponseHandler.success(res, formattedCategories);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories inactives:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des catégories inactives');
  }
};

// Fonction pour récupérer une catégorie par son ID
exports.getCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        created: true,
        updated: true,
        events: true,
      },
    });

    if (!category) {
      return ResponseHandler.error(res, 'Catégorie non trouvée', 'NOT_FOUND');
    }

    const formattedCategory = formatSingleCategory(category);
    return ResponseHandler.success(res, formattedCategory);
  } catch (error) {
    console.error('Erreur lors de la récupération de la catégorie:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération de la catégorie');
  }
};

// Fonction pour mettre à jour une catégorie
exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = categoryCreateSerializer.validate(req.body);
    if (error) {
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // Mise à jour de la catégorie
    await prisma.category.update({
      where: { id },
      data: {
        name,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    // Récupération de la catégorie mise à jour
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        created: true,
        updated: true,
        events: true,
      },
    });

    if (!category) {
      return ResponseHandler.error(res, 'Catégorie non trouvée', 'NOT_FOUND');
    }

    const formattedCategory = formatSingleCategory(category);
    return ResponseHandler.success(res, formattedCategory);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la catégorie:', error);
    return ResponseHandler.error(res, 'Erreur lors de la mise à jour de la catégorie');
  }
};

// Fonction pour supprimer une catégorie
exports.deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await prisma.category.findUnique({
      where: {
        id,
        isActive: true
      },
    });

    if (!category) {
      return ResponseHandler.error(res, 'Catégorie non trouvée', 'NOT_FOUND');
    }

    await prisma.category.update({
      where: { id },
      data: {
        isActive: false,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.noContent(res);
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie:', error);
    return ResponseHandler.error(res, 'Erreur lors de la suppression de la catégorie');
  }
};

// Fonction pour restaurer une catégorie
exports.restoreCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await prisma.category.findUnique({
      where: {
        id,
        isActive: false
      },
    });

    if (!category) {
      return ResponseHandler.error(res, 'Catégorie non trouvée', 'NOT_FOUND');
    }

    await prisma.category.update({
      where: { id },
      data: {
        isActive: true,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.success(res, null, 'OK');
  } catch (error) {
    console.error('Erreur lors de la restauration de la catégorie:', error);
    return ResponseHandler.error(res, 'Erreur lors de la restauration de la catégorie');
  }
};

// Fonctions utilitaires
function buildWhereCondition(query) {
  const {
    search = '',
    isActive,
    createdById,
    updatedById,
    createdAt,
    updatedAt,
    createdAtStart,
    createdAtEnd,
    updatedAtStart,
    updatedAtEnd
  } = query;

  const whereCondition = {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { referenceNumber: { contains: search, mode: 'insensitive' } }
    ],
    AND: []
  };

  // Ajout des filtres booléens et autres
  if (isActive !== undefined) whereCondition.isActive = isActive === 'true';
  if (createdById) whereCondition.createdById = createdById;
  if (updatedById) whereCondition.updatedById = updatedById;

  // Gestion des dates
  addDateConditions(whereCondition, {
    createdAt,
    updatedAt,
    createdAtStart,
    createdAtEnd,
    updatedAtStart,
    updatedAtEnd
  });

  if (whereCondition.AND.length === 0) {
    delete whereCondition.AND;
  }

  return whereCondition;
}

function addDateConditions(whereCondition, dates) {
  const {
    createdAt,
    updatedAt,
    createdAtStart,
    createdAtEnd,
    updatedAtStart,
    updatedAtEnd
  } = dates;

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

function formatCategories(categories) {
  return categories.map(category => {
    const formattedCategory = { ...category };
    if (category.created) {
      formattedCategory.created = userResponseSerializer(category.created);
    }
    if (category.updated) {
      formattedCategory.updated = userResponseSerializer(category.updated);
    }
    return categoryResponseSerializer(formattedCategory);
  });
}

function formatSingleCategory(category) {
  if (category.created) {
    category.created = userResponseSerializer(category.created);
  }
  if (category.updated) {
    category.updated = userResponseSerializer(category.updated);
  }
  return categoryDetailResponseSerializer(category);
}

module.exports = exports;