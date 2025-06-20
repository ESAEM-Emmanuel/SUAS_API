const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const eventParticipantCreateSerializer = require('../serializers/eventParticipantCreateSerializer');
const eventParticipantResponseSerializer = require('../serializers/eventParticipantResponseSerializer');
const eventParticipantDetailResponseSerializer = require('../serializers/eventParticipantDetailResponseSerializer');
const userResponseSerializer = require('../serializers/userResponseSerializer');
const ResponseHandler = require('../utils/responseHandler');
const { sendEmail } = require('../services/emailService');

// Fonction pour créer un nouvel participant
exports.createParticipant = async (req, res) => {
  const { 
    eventId,
    ownerId, 
    eventParticipantRoleId,
  } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = eventParticipantCreateSerializer.validate(req.body);
    if (error) {
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // Vérification des contraintes d'unicité
    const existingParticipant = await prisma.eventParticipant.findFirst({
      where: { 
        eventId,
        ownerId,
        eventParticipantRoleId,
      }
    });
    if (existingParticipant) {
      return ResponseHandler.error(res, 'Ce participant existe déjà', 'CONFLICT');
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.eventParticipant);

    // Création du participant avec Prisma
    const newParticipant = await prisma.eventParticipant.create({
      data: {
        eventId,
        eventParticipantRoleId,
        ownerId,
        referenceNumber,
        isActive: true,
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.success(res, eventParticipantResponseSerializer(newParticipant), 'CREATED');
  } catch (error) {
    console.error('Erreur lors de la création du participant:', error);
    return ResponseHandler.error(res, 'Erreur lors de la création du participant');
  }
};

// Fonction pour récupérer tous les participants avec pagination
exports.getParticipants = async (req, res) => {
  try {
    console.log("Query parameters:", req.query);
    
    const validSortFields = [
      'id', 'referenceNumber', 'eventId', 'ownerId', 'eventParticipantRoleId',
      'isApproved', 'approvedAt', 'createdById', 'updatedById', 'approvedById',
      'isActive', 'createdAt', 'updatedAt'
    ];

    // Récupération des paramètres de pagination depuis la requête
    const page = parseInt(req.query.page) || 1;
    const requestedLimit = parseInt(req.query.limit) || 100;
    const requestedSortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order?.toUpperCase() === 'ASC' ? 'asc' : 'desc';

    // Validation du champ de tri
    const sortBy = validSortFields.includes(requestedSortBy) ? requestedSortBy : 'createdAt';

    // Construction des conditions de recherche et de filtrage
    const whereCondition = {};
    
    // Ajout des filtres de base
    if (req.query.eventId) {
      whereCondition.eventId = req.query.eventId;
    }
    if (req.query.ownerId) {
      whereCondition.ownerId = req.query.ownerId;
    }
    if (req.query.eventParticipantRoleId) {
      whereCondition.eventParticipantRoleId = req.query.eventParticipantRoleId;
    }
    if (req.query.isActive !== undefined) {
      whereCondition.isActive = req.query.isActive === 'true';
    } else {
      // Par défaut, on ne montre que les participants actifs
      whereCondition.isActive = true;
    }

    // Logs de débogage
    console.log('Where condition:', JSON.stringify(whereCondition, null, 2));

    // Vérification directe des données
    console.log('Checking records with current filters...');
    const sampleRecords = await prisma.eventParticipant.findMany({
      where: whereCondition,
      take: 5,
      select: {
        id: true,
        eventId: true,
        ownerId: true,
        isActive: true,
        createdAt: true
      }
    });
    console.log('Sample records found:', sampleRecords);

    // Récupération du nombre total de participants
    const total = await prisma.eventParticipant.count({ where: whereCondition });
    console.log('Total count with filters:', total);

    // Protection contre les performances
    const MAX_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_FOR_UNLIMITED_QUERY) {
      return ResponseHandler.error(
        res,
        `La récupération de tous les participants est limitée à ${MAX_FOR_UNLIMITED_QUERY} entrées. Veuillez utiliser la pagination.`,
        'BAD_REQUEST'
      );
    }

    // Configuration de la requête
    const findManyOptions = {
      where: whereCondition,
      orderBy: { [sortBy]: order },
      include: {
        eventParticipantRole: true,
        created: true,
        updated: true,
        approved: true,
        owner: true,
        event: true,
      }
    };

    // Ajouter la pagination seulement si limit n'est pas -1
    if (requestedLimit !== -1) {
      findManyOptions.skip = (page - 1) * requestedLimit;
      findManyOptions.take = requestedLimit;
    }

    // Récupération des participants
    const participants = await prisma.eventParticipant.findMany(findManyOptions);
    console.log('Found participants count:', participants.length);

    // Formatage des participants avec les relations
    const formattedParticipants = participants.map(participant => {
      const formattedParticipant = { ...participant };
      if (participant.created) {
        formattedParticipant.created = userResponseSerializer(participant.created);
      }
      if (participant.updated) {
        formattedParticipant.updated = userResponseSerializer(participant.updated);
      }
      if (participant.approved) {
        formattedParticipant.approved = userResponseSerializer(participant.approved);
      }
      if (participant.owner) {
        formattedParticipant.owner = userResponseSerializer(participant.owner);
      }
      return eventParticipantResponseSerializer(formattedParticipant);
    });

    // Préparation de la réponse
    const response = {
      data: formattedParticipants,
      pagination: buildPaginationData(total, page, requestedLimit),
      filters: {
        sortBy,
        order,
        dates: {},
        attributes: {
          eventId: req.query.eventId,
          ownerId: req.query.ownerId,
          eventParticipantRoleId: req.query.eventParticipantRoleId,
          isActive: req.query.isActive
        }
      },
      validSortFields
    };

    return ResponseHandler.success(res, response);
  } catch (error) {
    console.error('Erreur lors de la récupération des participants:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des participants');
  }
};

// Fonction pour récupérer tous les participants avec pagination
exports.getParticipantsInactifs = async (req, res) => {
  const { page = 1, limit = 100, eventId, eventParticipantRoleId, ownerId } = req.query;

  try {
    // Construction de la condition where
    const whereCondition = {
      isActive: false,
      ...(eventId && { eventId }),
      ...(eventParticipantRoleId && { eventParticipantRoleId }),
      ...(ownerId && { ownerId })
    };

    // Récupération du nombre total de participants inactifs avec les filtres
    const total = await prisma.eventParticipant.count({ where: whereCondition });

    const participants = await prisma.eventParticipant.findMany({
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      where: whereCondition,
      include: {
        eventParticipantRole: true,
        created: true,
        updated: true,
        approved: true,
        owner: true,
        event: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Formatage des participants avec les relations
    const formattedParticipants = participants.map(participant => {
      const formattedParticipant = { ...participant };
      if (participant.created) {
        formattedParticipant.created = userResponseSerializer(participant.created);
      }
      if (participant.updated) {
        formattedParticipant.updated = userResponseSerializer(participant.updated);
      }
      if (participant.approved) {
        formattedParticipant.approved = userResponseSerializer(participant.approved);
      }
      if (participant.owner) {
        formattedParticipant.owner = userResponseSerializer(participant.owner);
      }
      return eventParticipantResponseSerializer(formattedParticipant);
    });

    // Préparation de la réponse avec pagination
    const response = {
      data: formattedParticipants,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPreviousPage: parseInt(page) > 1
      }
    };

    return ResponseHandler.success(res, response);
  } catch (error) {
    console.error('Erreur lors de la récupération des participants inactifs:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des participants inactifs');
  }
};

// Fonction pour récupérer un participant par son ID
exports.getParticipant = async (req, res) => {
  const { id } = req.params;

  try {
    const participant = await prisma.eventParticipant.findUnique({
      where: { id },
      include: {
        eventParticipantRole: true,
        created: true,
        updated: true,
        approved: true,
        owner: true,
        event: true,
      },
    });

    if (!participant) {
      return ResponseHandler.error(res, 'Participant non trouvé', 'NOT_FOUND');
    }

    // Formatage des relations
    if (participant.created) {
      participant.created = userResponseSerializer(participant.created);
    }
    if (participant.updated) {
      participant.updated = userResponseSerializer(participant.updated);
    }
    if (participant.approved) {
      participant.approved = userResponseSerializer(participant.approved);
    }
    if (participant.owner) {
      participant.owner = userResponseSerializer(participant.owner);
    }

    return ResponseHandler.success(res, eventParticipantDetailResponseSerializer(participant));
  } catch (error) {
    console.error('Erreur lors de la récupération du participant:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération du participant');
  }
};

// Fonction pour mettre à jour un participant
exports.updateParticipant = async (req, res) => {
  const { id } = req.params;
  const {
    eventId,
    name,
    firstName,
    companyName,
    businessSector,
    functionC,
    positionInCompany,
    photo,
    description,
    room,
    numberOfPlaces,
    price,
    startDate,
    endDate,
  } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = eventParticipantCreateSerializer.validate(req.body);
    if (error) {
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // Mise à jour du participant
    await prisma.eventParticipant.update({
      where: { id },
      data: {
        eventId,
        name,
        firstName,
        companyName,
        businessSector,
        functionC,
        positionInCompany,
        photo: photo || null,
        description,
        room,
        numberOfPlaces,
        isActiveMicrophone: false,
        isHandRaised: false,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
      include: {
        eventParticipantRole: true,
        created: true,
        updated: true,
        approved: true,
        owner: true,
        event: true,
      },
    });

    // Récupération du participant mis à jour
    const participant = await prisma.eventParticipant.findUnique({
      where: { id },
      include: {
        eventParticipantRole: true,
        created: true,
        updated: true,
        approved: true,
        owner: true,
        event: true,
      },
    });

    if (!participant) {
      return ResponseHandler.error(res, 'Participant non trouvé', 'NOT_FOUND');
    }

    // Formatage des relations
    if (participant.created) {
      participant.created = userResponseSerializer(participant.created);
    }
    if (participant.updated) {
      participant.updated = userResponseSerializer(participant.updated);
    }
    if (participant.approved) {
      participant.approved = userResponseSerializer(participant.approved);
    }
    if (participant.owner) {
      participant.owner = userResponseSerializer(participant.owner);
    }

    return ResponseHandler.success(res, eventParticipantDetailResponseSerializer(participant));
  } catch (error) {
    console.error('Erreur lors de la mise à jour du participant:', error);
    return ResponseHandler.error(res, 'Erreur lors de la mise à jour du participant');
  }
};

// Fonction pour approuver un participant
exports.approvedParticipant = async (req, res) => {
  const { id } = req.params;

  try {
    const participant = await prisma.eventParticipant.findUnique({
      where: {
        id,
        isActive: true
      },
      include: {
        event: true, // Inclure les informations du workshop
        owner: true  // Inclure l'utilisateur rattaché
      }
    });

    if (!participant) {
      return ResponseHandler.error(res, 'Participant non trouvé', 'NOT_FOUND');
    }

    await prisma.eventParticipant.update({
      where: { id },
      data: {
        isApproved: true,
        approvedById: req.userId,
        approvedAt: DateTime.now().toJSDate(),
      },
    });

    // Envoi d'un email de notification à l'utilisateur rattaché si il a un email
    if (participant.owner && participant.owner.email) {
      const to = participant.owner.email;
      console.log('destinataire', to);
      const subject = 'Votre participation a été approuvée';
      const titre = 'Félicitations, votre participation est approuvée !';
      const message = `Bonjour ${participant.owner.firstName || ''} ${participant.owner.name || ''},<br><br>Votre participation à l\'évènement <b>${participant.event.name || ''}</b> a été approuvée.<br>Nous vous remercions pour votre intérêt et vous souhaitons une excellente expérience.<br><br>Référence participant : <b>${participant.referenceNumber}</b>`;
      const signature = "L'équipe SUAS";
      sendEmail(to, subject, titre, message, signature).catch((err) => {
        console.error('Erreur lors de l\'envoi de l\'email de notification :', err);
      });
    }

    return ResponseHandler.success(res, null, 'OK');
  } catch (error) {
    console.error('Erreur lors de l\'approbation du participant:', error);
    return ResponseHandler.error(res, 'Erreur lors de l\'approbation du participant');
  }
};


exports.deleteParticipant = async (req, res) => {
  const { id } = req.params;

  try {
    const participant = await prisma.eventParticipant.findUnique({
      where: {
        id,
        isActive: true
      },
    });

    if (!participant) {
      return ResponseHandler.error(res, 'Participant non trouvé', 'NOT_FOUND');
    }

    await prisma.eventParticipant.update({
      where: { id },
      data: {
        isActive: false,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.noContent(res);
  } catch (error) {
    console.error('Erreur lors de la suppression du participant:', error);
    return ResponseHandler.error(res, 'Erreur lors de la suppression du participant');
  }
};

// Fonction pour restorer un participant
exports.restoreParticipant = async (req, res) => {
  const { id } = req.params;

  try {
    const participant = await prisma.eventParticipant.findUnique({
      where: {
        id,
        isActive: false
      },
    });

    if (!participant) {
      return ResponseHandler.error(res, 'Participant non trouvé', 'NOT_FOUND');
    }

    await prisma.eventParticipant.update({
      where: { id },
      data: {
        isActive: true,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.success(res, null, 'OK');
  } catch (error) {
    console.error('Erreur lors de la restauration du participant:', error);
    return ResponseHandler.error(res, 'Erreur lors de la restauration du participant');
  }
};

// Fonctions utilitaires
function buildWhereCondition(query) {
  const {
    eventId,
    eventParticipantRoleId,
    ownerId,
    isActive,
    isApproved,
    createdById,
    updatedById,
    approvedById,
  } = query;

  const whereCondition = {};

  // Ajout des filtres booléens et autres
  if (isActive !== undefined) whereCondition.isActive = isActive === 'true';
  if (isApproved !== undefined) whereCondition.isApproved = isApproved === 'true';
  if (createdById) whereCondition.createdById = createdById;
  if (updatedById) whereCondition.updatedById = updatedById;
  if (approvedById) whereCondition.approvedById = approvedById;
  if (eventId) whereCondition.eventId = eventId;
  if (ownerId) whereCondition.ownerId = ownerId;
  if (eventParticipantRoleId) whereCondition.eventParticipantRoleId = eventParticipantRoleId;

  // Gestion des dates
  const dateConditions = [];
  addDateConditions(dateConditions, query);
  
  if (dateConditions.length > 0) {
    whereCondition.AND = dateConditions;
  }

  return whereCondition;
}

function addDateConditions(dateConditions, query) {
  const {
    createdAt,
    updatedAt,
    approvedAt,
    createdAtStart,
    createdAtEnd,
    updatedAtStart,
    updatedAtEnd,
    approvedAtStart,
    approvedAtEnd
  } = query;

  if (createdAt) {
    const startOfDay = new Date(createdAt);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    dateConditions.push({
      createdAt: {
        gte: startOfDay,
        lt: endOfDay
      }
    });
  } else if (createdAtStart || createdAtEnd) {
    dateConditions.push({
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
    dateConditions.push({
      updatedAt: {
        gte: startOfDay,
        lt: endOfDay
      }
    });
  } else if (updatedAtStart || updatedAtEnd) {
    dateConditions.push({
      updatedAt: {
        ...(updatedAtStart && { gte: new Date(updatedAtStart) }),
        ...(updatedAtEnd && { lte: new Date(updatedAtEnd) })
      }
    });
  }

  if (approvedAt) {
    const startOfDay = new Date(approvedAt);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    dateConditions.push({
      approvedAt: {
        gte: startOfDay,
        lt: endOfDay
      }
    });
  } else if (approvedAtStart || approvedAtEnd) {
    dateConditions.push({
      approvedAt: {
        ...(approvedAtStart && { gte: new Date(approvedAtStart) }),
        ...(approvedAtEnd && { lte: new Date(approvedAtEnd) })
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
    approvedAt,
    approvedAtStart,
    approvedAtEnd,
    isActive,
    isApproved,
    eventId,
    ownerId,
    eventParticipantRoleId,
    createdById,
    updatedById,
    approvedById
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
      updatedAtEnd,
      approvedAt,
      approvedAtStart,
      approvedAtEnd
    },
    attributes: {
      isActive,
      isApproved,
      eventId,
      ownerId,
      eventParticipantRoleId,
      createdById,
      updatedById,
      approvedById
    }
  };
}

// Export des fonctions du contrôleur
module.exports = exports;