const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const eventCreateSerializer = require('../serializers/eventCreateSerializer');
const eventResponseSerializer = require('../serializers/eventResponseSerializer');
const eventDetailResponseSerializer = require('../serializers/eventDetailResponseSerializer');
const userResponseSerializer = require('../serializers/userResponseSerializer');
const ResponseHandler = require('../utils/responseHandler');

// Fonction pour créer un nouvel Event
exports.createEvent = async (req, res) => {
  const { categoryId, name, photo, program, description, startDate, endDate, ownerId, isPublic } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = eventCreateSerializer.validate(req.body);
    if (error) {
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // Vérification des contraintes d'unicité
    const existingEvent = await prisma.event.findFirst({
      where: {
        OR: [
          { photo: photo },
          { program: program }
        ]
      }
    });
    
    if (existingEvent) {
      let errorMessage = '';
      if (existingEvent.program === program) {
        errorMessage += 'Ce programme est déjà utilisé';
      }
      if (existingEvent.photo === photo) {
        errorMessage += errorMessage ? ', ' : '';
        errorMessage += 'Cette image est déjà utilisée';
      }
      return ResponseHandler.error(res, errorMessage, 'CONFLICT');
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.event);

    // Formatage des dates
    const formattedStartDate = startDate;

    const formattedEndDate = endDate;
    // const formattedStartDate = new Date(startDate);
    // formattedStartDate.setHours(0, 0, 0, 0);

    // const formattedEndDate = new Date(endDate);
    // formattedEndDate.setHours(23, 59, 59, 999);

    // Comparer les dates
    if (formattedEndDate < formattedStartDate) {
      return ResponseHandler.error(res, 'La date de fin doit être postérieure à la date de début', 'BAD_REQUEST');
    }

    // Création de l'événement avec Prisma
    const newEvent = await prisma.event.create({
      data: {
        categoryId,
        name,
        photo,
        program,
        description,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        ownerId,
        referenceNumber,
        isActive: true,
        isPublic: isPublic || false,
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.success(res, eventResponseSerializer(newEvent), 'CREATED');
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement:', error);
    return ResponseHandler.error(res, 'Erreur lors de la création de l\'événement');
  }
};

// Fonction pour récupérer tous les Events avec pagination
exports.getEventsByOwner = async (req, res) => {
  const { page = 1, limit = 100 } = req.query;
  const { id } = req.params;

  try {
    const events = await prisma.event.findMany({
      where: {
        ownerId: id,
        isActive: true,
      },
      include: {
        workshops: true,
        category: true,
        owner: true,
        masterOfCeremonies: true,
        eventParticipants: true,
      },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { name: 'asc' },
    });

    // Formater les objets imbriqués
    const formattedEvents = events.map(event => {
      const formattedEvent = { ...event };
      if (event.owner) {
        formattedEvent.owner = userResponseSerializer(event.owner);
      }
      if (event.masterOfCeremonies) {
        formattedEvent.masterOfCeremonies = event.masterOfCeremonies.map(mc => userResponseSerializer(mc));
      }
      return eventResponseSerializer(formattedEvent);
    });

    return ResponseHandler.success(res, formattedEvents);
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des événements');
  }
};

// Fonction pour récupérer tous les Events avec pagination
exports.getEvents = async (req, res) => {
  try {
    const validSortFields = [
      'id', 'referenceNumber', 'name', 'description', 'photo', 'startDate',
      'endDate', 'isApproved', 'approvedAt', 'createdById', 'updatedById',
      'approvedById', 'ownerId', 'categoryId', 'isActive', 'createdAt',
      'updatedAt', 'isPublic'
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

    // Récupération du nombre total d'événements
    const total = await prisma.event.count({ where: whereCondition });

    // Protection contre les performances
    const MAX_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_FOR_UNLIMITED_QUERY) {
      return ResponseHandler.error(
        res,
        `La récupération de tous les événements est limitée à ${MAX_FOR_UNLIMITED_QUERY} entrées. Veuillez utiliser la pagination.`,
        'BAD_REQUEST'
      );
    }

    // Configuration de la requête
    const findManyOptions = {
      where: whereCondition,
      orderBy: { [sortBy]: order },
      include: {
        category: true,
        workshops: true,
        owner: true,
        masterOfCeremonies: true
      }
    };

    // Ajouter la pagination seulement si limit n'est pas -1
    if (requestedLimit !== -1) {
      findManyOptions.skip = (page - 1) * requestedLimit;
      findManyOptions.take = requestedLimit;
    }

    // Récupération des événements
    const events = await prisma.event.findMany(findManyOptions);

    // Formatage des événements avec les relations
    const formattedEvents = events.map(event => {
      const formattedEvent = { ...event };
      if (event.owner) {
        formattedEvent.owner = userResponseSerializer(event.owner);
      }
      if (event.masterOfCeremonies) {
        formattedEvent.masterOfCeremonies = event.masterOfCeremonies.map(mc => userResponseSerializer(mc));
      }
      return eventResponseSerializer(formattedEvent);
    });

    // Préparation de la réponse
    const response = {
      data: formattedEvents,
      pagination: buildPaginationData(total, page, requestedLimit),
      filters: buildFiltersData(req.query, sortBy, order),
      validSortFields
    };

    return ResponseHandler.success(res, response);
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des événements');
  }
};

// Fonction pour récupérer tous les Events inactifs
exports.getEventsInactifs = async (req, res) => {
  const { page = 1, limit = 100 } = req.query;

  try {
    const events = await prisma.event.findMany({
      include: {
        category: true,
        workshops: true,
        owner: true,
        masterOfCeremonies: true,
        eventParticipants: true,
      },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      where: { isActive: false },
      orderBy: { name: 'asc' },
    });

    // Formater les objets imbriqués
    const formattedEvents = events.map(event => {
      const formattedEvent = { ...event };
      if (event.owner) {
        formattedEvent.owner = userResponseSerializer(event.owner);
      }
      if (event.masterOfCeremonies) {
        formattedEvent.masterOfCeremonies = event.masterOfCeremonies.map(mc => userResponseSerializer(mc));
      }
      return eventResponseSerializer(formattedEvent);
    });

    return ResponseHandler.success(res, formattedEvents);
  } catch (error) {
    console.error('Erreur lors de la récupération des événements inactifs:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des événements inactifs');
  }
};

// Fonction pour récupérer un Event par son ID
exports.getEvent = async (req, res) => {
  const { id } = req.params;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        created: true,
        updated: true,
        approved: true,
        owner: true,
        category: true,
        workshops: {
          include: {
            owner: true
          }
        },
        masterOfCeremonies: true,
        eventParticipants: true,
      }
    });

    if (!event) {
      return ResponseHandler.error(res, 'Événement non trouvé', 'NOT_FOUND');
    }

    // Formatage des relations
    if (event.owner) {
      event.owner = userResponseSerializer(event.owner);
    }
    if (event.created) {
      event.created = userResponseSerializer(event.created);
    }
    if (event.updated) {
      event.updated = userResponseSerializer(event.updated);
    }
    if (event.approved) {
      event.approved = userResponseSerializer(event.approved);
    }

    // Formatage des workshops et leurs propriétaires
    const formattedEvent = {
      ...event,
      workshops: event.workshops.map(workshop => ({
        ...workshop,
        owner: workshop.owner ? userResponseSerializer(workshop.owner) : null
      }))
    };

    return ResponseHandler.success(res, eventDetailResponseSerializer(formattedEvent));
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération de l\'événement');
  }
};

// Fonction pour mettre à jour un Event
exports.updateEvent = async (req, res) => {
  const { id } = req.params;
  const {
    categoryId,
    name,
    photo,
    description,
    startDate,
    endDate,
    ownerId,
    isPublic
  } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = eventCreateSerializer.validate(req.body);
    if (error) {
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // S'assurer que startDate et endDate ne contiennent que la date (sans heure)
    const formattedStartDate = new Date(startDate);
    formattedStartDate.setHours(0, 0, 0, 0);

    const formattedEndDate = new Date(endDate);
    formattedEndDate.setHours(23, 59, 59, 999);

    // Comparer les dates
    if (formattedEndDate < formattedStartDate) {
      return ResponseHandler.error(res, 'La date de fin doit être postérieure à la date de début', 'BAD_REQUEST');
    }

    // Mise à jour de l'événement
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        categoryId,
        name,
        photo,
        description,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        ownerId,
        isPublic: isPublic || false,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
      include: {
        created: true,
        updated: true,
        approved: true,
        owner: true,
        category: true,
        workshops: true,
        masterOfCeremonies: true,
        eventParticipants: true,
      },
    });

    // Formatage des relations
    if (updatedEvent.owner) {
      updatedEvent.owner = userResponseSerializer(updatedEvent.owner);
    }
    if (updatedEvent.created) {
      updatedEvent.created = userResponseSerializer(updatedEvent.created);
    }
    if (updatedEvent.updated) {
      updatedEvent.updated = userResponseSerializer(updatedEvent.updated);
    }
    if (updatedEvent.approved) {
      updatedEvent.approved = userResponseSerializer(updatedEvent.approved);
    }

    return ResponseHandler.success(res, eventDetailResponseSerializer(updatedEvent));
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement:', error);
    return ResponseHandler.error(res, 'Erreur lors de la mise à jour de l\'événement');
  }
};

// Fonction pour approuver un Event
exports.approvedEvent = async (req, res) => {
  const { id } = req.params;

  try {
    const event = await prisma.event.findUnique({
      where: {
        id,
        isActive: true
      },
    });

    if (!event) {
      return ResponseHandler.error(res, 'Événement non trouvé', 'NOT_FOUND');
    }

    await prisma.event.update({
      where: { id },
      data: {
        isApproved: true,
        approvedById: req.userId,
        approvedAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.success(res, null, 'OK');
  } catch (error) {
    console.error('Erreur lors de l\'approbation de l\'événement:', error);
    return ResponseHandler.error(res, 'Erreur lors de l\'approbation de l\'événement');
  }
};

// Fonction pour supprimer un Event
exports.deleteEvent = async (req, res) => {
  const { id } = req.params;

  try {
    const event = await prisma.event.findUnique({
      where: {
        id,
        isActive: true
      },
    });

    if (!event) {
      return ResponseHandler.error(res, 'Événement non trouvé', 'NOT_FOUND');
    }

    await prisma.event.update({
      where: { id },
      data: {
        isActive: false,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.noContent(res);
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement:', error);
    return ResponseHandler.error(res, 'Erreur lors de la suppression de l\'événement');
  }
};

// Fonction pour restaurer un Event
exports.restoreEvent = async (req, res) => {
  const { id } = req.params;

  try {
    const event = await prisma.event.findUnique({
      where: {
        id,
        isActive: false
      },
    });

    if (!event) {
      return ResponseHandler.error(res, 'Événement non trouvé', 'NOT_FOUND');
    }

    await prisma.event.update({
      where: { id },
      data: {
        isActive: true,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.success(res, null, 'OK');
  } catch (error) {
    console.error('Erreur lors de la restauration de l\'événement:', error);
    return ResponseHandler.error(res, 'Erreur lors de la restauration de l\'événement');
  }
};

// Fonctions utilitaires
function buildWhereCondition(query) {
  const {
    search = '',
    isActive,
    isPublic,
    createdById,
    updatedById,
    approvedById,
    categoryId,
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
  if (isPublic !== undefined) whereCondition.isPublic = isPublic === 'true';
  if (createdById) whereCondition.createdById = createdById;
  if (updatedById) whereCondition.updatedById = updatedById;
  if (approvedById) whereCondition.approvedById = approvedById;
  if (ownerId) whereCondition.ownerId = ownerId;
  if (categoryId) whereCondition.categoryId = categoryId;

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
    isPublic,
    isActive,
    ownerId,
    createdById,
    updatedById,
    approvedById,
    categoryId
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
      isPublic,
      isActive,
      ownerId,
      createdById,
      updatedById,
      approvedById,
      categoryId
    }
  };
}

// Export des fonctions du contrôleur
module.exports = exports;