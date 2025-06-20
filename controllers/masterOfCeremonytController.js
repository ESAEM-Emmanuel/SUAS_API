const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const masterOfCeremonyCreateSerializer = require('../serializers/masterOfCeremonyCreateSerializer');
const masterOfCeremonyResponseSerializer = require('../serializers/masterOfCeremonyResponseSerializer');
const masterOfCeremonyDetailResponseSerializer = require('../serializers/masterOfCeremonyDetailResponseSerializer');
const userResponseSerializer = require('../serializers/userResponseSerializer');
const ResponseHandler = require('../utils/responseHandler');

// Fonction pour créer un nouvel masterOfCeremony
exports.createMasterOfCeremony = async (req, res) => {
  const { 
    eventId,
    ownerId,
    name,
    description
  } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = masterOfCeremonyCreateSerializer.validate(req.body);
    if (error) {
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // Vérification des contraintes d'unicité
    const existingMasterOfCeremony = await prisma.masterOfCeremony.findFirst({
      where: { 
        eventId,
        ownerId,
      }
    });
    if (existingMasterOfCeremony) {
      return ResponseHandler.error(res, 'Ce maître de cérémonie existe déjà', 'CONFLICT');
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.masterOfCeremony);

    // Création du maître de cérémonie avec Prisma
    const newMasterOfCeremony = await prisma.masterOfCeremony.create({
      data: {
        eventId,
        ownerId,
        name,
        description,
        referenceNumber,
        isActive: true,
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.success(res, masterOfCeremonyResponseSerializer(newMasterOfCeremony), 'CREATED');
  } catch (error) {
    console.error('Erreur lors de la création du maître de cérémonie:', error);
    return ResponseHandler.error(res, 'Erreur lors de la création du maître de cérémonie');
  }
};

// Fonction pour récupérer tous les masterOfCeremonys avec pagination
exports.getMasterOfCeremonys = async (req, res) => {
  try {
    const validSortFields = [
      'id', 'referenceNumber', 'name', 'description', 'eventId',
      'ownerId', 'createdById', 'updatedById', 'isActive', 'createdAt',
      'updatedAt'
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

    // Récupération du nombre total de maîtres de cérémonie
    const total = await prisma.masterOfCeremony.count({ where: whereCondition });

    // Protection contre les performances
    const MAX_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_FOR_UNLIMITED_QUERY) {
      return ResponseHandler.error(
        res,
        `La récupération de tous les maîtres de cérémonie est limitée à ${MAX_FOR_UNLIMITED_QUERY} entrées. Veuillez utiliser la pagination.`,
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
        owner: true,
        event: true
      }
    };

    // Ajouter la pagination seulement si limit n'est pas -1
    if (requestedLimit !== -1) {
      findManyOptions.skip = (page - 1) * requestedLimit;
      findManyOptions.take = requestedLimit;
    }

    // Récupération des maîtres de cérémonie
    const masterOfCeremonies = await prisma.masterOfCeremony.findMany(findManyOptions);

    // Formatage des maîtres de cérémonie avec les relations
    const formattedMasterOfCeremonies = masterOfCeremonies.map(moc => {
      const formattedMoc = { ...moc };
      if (moc.created) {
        formattedMoc.created = userResponseSerializer(moc.created);
      }
      if (moc.updated) {
        formattedMoc.updated = userResponseSerializer(moc.updated);
      }
      if (moc.owner) {
        formattedMoc.owner = userResponseSerializer(moc.owner);
      }
      return masterOfCeremonyResponseSerializer(formattedMoc);
    });

    // Préparation de la réponse
    const response = {
      data: formattedMasterOfCeremonies,
      pagination: buildPaginationData(total, page, requestedLimit),
      filters: buildFiltersData(req.query, sortBy, order),
      validSortFields
    };

    return ResponseHandler.success(res, response);
  } catch (error) {
    console.error('Erreur lors de la récupération des maîtres de cérémonie:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des maîtres de cérémonie');
  }
};

// Fonction pour récupérer tous les masterOfCeremonys avec pagination
exports.getMasterOfCeremonysInactifs = async (req, res) => {
  const { page = 1, limit = 100 } = req.query;

  try {
    const masterOfCeremonies = await prisma.masterOfCeremony.findMany({
      skip: (page - 1) * limit,
      take: parseInt(limit),
      where: { isActive: false },
      orderBy: { name: 'asc' },
    });

    const formattedMasterOfCeremonies = masterOfCeremonies.map(masterOfCeremonyResponseSerializer);
    return ResponseHandler.success(res, formattedMasterOfCeremonies);
  } catch (error) {
    console.error('Erreur lors de la récupération des maîtres de cérémonie inactifs:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des maîtres de cérémonie inactifs');
  }
};

// Fonction pour récupérer un masterOfCeremony par son ID
exports.getMasterOfCeremony = async (req, res) => {
  const { id } = req.params;

  try {
    const masterOfCeremony = await prisma.masterOfCeremony.findUnique({
      where: { id },
      include: {
        created: true,
        updated: true,
        owner: true,
        event: true,
      },
    });

    if (!masterOfCeremony) {
      return ResponseHandler.error(res, 'Maître de cérémonie non trouvé', 'NOT_FOUND');
    }

    // Formatage des relations
    if (masterOfCeremony.created) {
      masterOfCeremony.created = userResponseSerializer(masterOfCeremony.created);
    }
    if (masterOfCeremony.updated) {
      masterOfCeremony.updated = userResponseSerializer(masterOfCeremony.updated);
    }
    if (masterOfCeremony.owner) {
      masterOfCeremony.owner = userResponseSerializer(masterOfCeremony.owner);
    }

    return ResponseHandler.success(res, masterOfCeremonyDetailResponseSerializer(masterOfCeremony));
  } catch (error) {
    console.error('Erreur lors de la récupération du maître de cérémonie:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération du maître de cérémonie');
  }
};

// Fonction pour mettre à jour un masterOfCeremony
exports.updateMasterOfCeremony = async (req, res) => {
  const { id } = req.params;
  const { 
    eventId,
    ownerId,
    name,
    description
  } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = masterOfCeremonyCreateSerializer.validate(req.body);
    if (error) {
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // Mise à jour du maître de cérémonie
    const masterOfCeremony = await prisma.masterOfCeremony.update({
      where: { id },
      data: {
        eventId,
        ownerId,
        name,
        description,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
      include: {
        created: true,
        updated: true,
        owner: true,
        event: true,
      },
    });

    if (!masterOfCeremony) {
      return ResponseHandler.error(res, 'Maître de cérémonie non trouvé', 'NOT_FOUND');
    }

    // Formatage des relations
    if (masterOfCeremony.created) {
      masterOfCeremony.created = userResponseSerializer(masterOfCeremony.created);
    }
    if (masterOfCeremony.updated) {
      masterOfCeremony.updated = userResponseSerializer(masterOfCeremony.updated);
    }
    if (masterOfCeremony.owner) {
      masterOfCeremony.owner = userResponseSerializer(masterOfCeremony.owner);
    }

    return ResponseHandler.success(res, masterOfCeremonyDetailResponseSerializer(masterOfCeremony));
  } catch (error) {
    console.error('Erreur lors de la mise à jour du maître de cérémonie:', error);
    return ResponseHandler.error(res, 'Erreur lors de la mise à jour du maître de cérémonie');
  }
};

exports.deleteMasterOfCeremony = async (req, res) => {
  const { id } = req.params;

  try {
    const masterOfCeremony = await prisma.masterOfCeremony.findUnique({
      where: {
        id,
        isActive: true
      },
    });

    if (!masterOfCeremony) {
      return ResponseHandler.error(res, 'Maître de cérémonie non trouvé', 'NOT_FOUND');
    }

    await prisma.masterOfCeremony.update({
      where: { id },
      data: {
        isActive: false,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.noContent(res);
  } catch (error) {
    console.error('Erreur lors de la suppression du maître de cérémonie:', error);
    return ResponseHandler.error(res, 'Erreur lors de la suppression du maître de cérémonie');
  }
};

// Fonction pour restorer un masterOfCeremony
exports.restoreMasterOfCeremony = async (req, res) => {
  const { id } = req.params;

  try {
    const masterOfCeremony = await prisma.masterOfCeremony.findUnique({
      where: {
        id,
        isActive: false
      },
    });

    if (!masterOfCeremony) {
      return ResponseHandler.error(res, 'Maître de cérémonie non trouvé', 'NOT_FOUND');
    }

    await prisma.masterOfCeremony.update({
      where: { id },
      data: {
        isActive: true,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.success(res, null, 'OK');
  } catch (error) {
    console.error('Erreur lors de la restauration du maître de cérémonie:', error);
    return ResponseHandler.error(res, 'Erreur lors de la restauration du maître de cérémonie');
  }
};

// Fonctions utilitaires
function buildWhereCondition(query) {
  const {
    search = '',
    isActive,
    createdById,
    updatedById,
    eventId,
    ownerId
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
  if (eventId) whereCondition.eventId = eventId;
  if (ownerId) whereCondition.ownerId = ownerId;

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
    eventId,
    ownerId,
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
      eventId,
      ownerId,
      createdById,
      updatedById
    }
  };
}

// Export des fonctions du contrôleur
module.exports = exports;