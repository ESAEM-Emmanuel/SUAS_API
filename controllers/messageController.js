const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const messageCreateSerializer = require('../serializers/messageCreateSerializer');
const messageResponseSerializer = require('../serializers/messageResponseSerializer');
const messageDetailResponseSerializer = require('../serializers/messageDetailResponseSerializer');
const userResponseSerializer = require('../serializers/userResponseSerializer');
const participantResponseSerializer = require('../serializers/participantResponseSerializer');
const participantRoleResponseSerializer = require('../serializers/participantRoleResponseSerializer');
const ResponseHandler = require('../utils/responseHandler');

// Fonction pour créer un nouvel message
exports.createMessage = async (req, res) => {
  console.log('Endpoint: POST /messages/create');
  console.log('Request Body:', req.body);

  // Extraction des données de la requête
  const { 
    workshopId,
    content,
    urlFile,
    messageType,
    participantId } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = messageCreateSerializer.validate(req.body);
    if (error) {
      console.log('Validation Error:', error.details[0].message);
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.message);

    // Création de l'événement avec Prisma
    const newMessage = await prisma.message.create({
      data: {
        workshopId,
        content,
        messageType,
        participantId,
        urlFile : urlFile || null,
        referenceNumber,
        isActive: true,
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
      },
    });

    console.log('Message created successfully:', newMessage);
    return ResponseHandler.success(res, newMessage, 'CREATED');
  } catch (error) {
    console.error('Error creating message:', error);
    return ResponseHandler.error(res, 'Erreur lors de la création du message');
  }
};

// Fonction pour récupérer tous les messages avec pagination
exports.getMessages = async (req, res) => {
  console.log('Endpoint: GET /messages');
  console.log('Query Parameters:', req.query);

  try {
    // Liste des champs de tri valides
    const validSortFields = [
      'id', 'referenceNumber', 'content', 'messageType', 'workshopId',
      'participantId', 'createdById', 'updatedById', 'isActive',
      'createdAt', 'updatedAt', 'urlFile', 'tag'
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

    // Récupération du nombre total de messages
    const total = await prisma.message.count({ where: whereCondition });

    // Protection contre les performances
    const MAX_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_FOR_UNLIMITED_QUERY) {
      console.log('Error: Too many results requested without pagination');
      return ResponseHandler.error(
        res,
        `La récupération de tous les messages est limitée à ${MAX_FOR_UNLIMITED_QUERY} entrées. Veuillez utiliser la pagination.`,
        'BAD_REQUEST'
      );
    }

    // Configuration de la requête
    const findManyOptions = {
      where: whereCondition,
      orderBy: { [sortBy]: order },
      include: {
        workshop: true,
        participant: {
          include: {
            participantRole: true,
            owner: true
          }
        },
        created: true,
        updated: true
      }
    };

    // Ajouter la pagination seulement si limit n'est pas -1
    if (requestedLimit !== -1) {
      findManyOptions.skip = (page - 1) * requestedLimit;
      findManyOptions.take = requestedLimit;
    }

    // Récupération des messages
    const messages = await prisma.message.findMany(findManyOptions);

    // Formatage des messages
    const formattedMessages = formatMessages(messages);

    // Préparation de la réponse
    const response = {
      data: formattedMessages,
      pagination: buildPaginationData(total, page, requestedLimit),
      filters: buildFiltersData(req.query, sortBy, order),
      validSortFields
    };

    console.log('Messages retrieved successfully. Total count:', total);
    return ResponseHandler.success(res, response);
  } catch (error) {
    console.error('Error retrieving messages:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des messages');
  }
};

// Fonction pour récupérer tous les messages inactifs
exports.getMessagesInactifs = async (req, res) => {
  console.log('Endpoint: GET /messages/inactifs');
  console.log('Query Parameters:', req.query);

  const { page = 1, limit = 100 } = req.query;

  try {
    const messages = await prisma.message.findMany({
      skip: (page - 1) * limit,
      take: parseInt(limit),
      where: { isActive: false },
      orderBy: { createdAt: 'asc' },
    });

    const formattedMessages = messages.map(messageResponseSerializer);
    console.log('Inactive messages retrieved successfully. Count:', messages.length);
    return ResponseHandler.success(res, formattedMessages);
  } catch (error) {
    console.error('Error retrieving inactive messages:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des messages inactifs');
  }
};

// Fonction pour récupérer un message par son ID
exports.getMessage = async (req, res) => {
  console.log('Endpoint: GET /messages/:id');
  console.log('Request Parameters:', req.params);

  const { id } = req.params;

  try {
    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        created: true,
        updated: true,
        workshop: true,
        participant: true,
      },
    });

    if (!message) {
      console.log('Error: Message not found');
      return ResponseHandler.error(res, 'Message non trouvé', 'NOT_FOUND');
    }

    const formattedMessage = formatSingleMessage(message);
    console.log('Message retrieved successfully:', formattedMessage);
    return ResponseHandler.success(res, formattedMessage);
  } catch (error) {
    console.error('Error retrieving message:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération du message');
  }
};

// Fonction pour mettre à jour un message
exports.updateMessage = async (req, res) => {
  console.log('Endpoint: PUT /messages/:id');
  console.log('Request Parameters:', req.params);
  console.log('Request Body:', req.body);

  const { id } = req.params;
  const {
    workshopId,
    content,
    urlFile,
    messageType,
    participantId 
  } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = messageCreateSerializer.validate(req.body);
    if (error) {
      console.log('Validation Error:', error.details[0].message);
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // Mise à jour du message
    await prisma.message.update({
      where: { id },
      data: {
        workshopId,
        content,
        messageType,
        participantId,
        urlFile: urlFile || null,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      }
    });

    // Récupération du message mis à jour
    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        created: true,
        updated: true,
        workshop: true,
        participant: true,
      },
    });

    if (!message) {
      console.log('Error: Message not found');
      return ResponseHandler.error(res, 'Message non trouvé', 'NOT_FOUND');
    }

    const formattedMessage = formatSingleMessage(message);
    console.log('Message updated successfully:', formattedMessage);
    return ResponseHandler.success(res, formattedMessage);
  } catch (error) {
    console.error('Error updating message:', error);
    return ResponseHandler.error(res, 'Erreur lors de la mise à jour du message');
  }
};

// Fonction pour supprimer un message
exports.deleteMessage = async (req, res) => {
  console.log('Endpoint: DELETE /messages/:id');
  console.log('Request Parameters:', req.params);

  const { id } = req.params;

  try {
    const message = await prisma.message.findUnique({
      where: {
        id,
        isActive: true
      },
    });

    if (!message) {
      console.log('Error: Message not found');
      return ResponseHandler.error(res, 'Message non trouvé', 'NOT_FOUND');
    }

    await prisma.message.update({
      where: { id },
      data: {
        isActive: false,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    console.log('Message deleted successfully');
    return ResponseHandler.noContent(res);
  } catch (error) {
    console.error('Error deleting message:', error);
    return ResponseHandler.error(res, 'Erreur lors de la suppression du message');
  }
};

// Fonction pour restaurer un message
exports.restoreMessage = async (req, res) => {
  console.log('Endpoint: PATCH /messages/:id/restore');
  console.log('Request Parameters:', req.params);

  const { id } = req.params;

  try {
    const message = await prisma.message.findUnique({
      where: {
        id,
        isActive: false
      },
    });

    if (!message) {
      console.log('Error: Message not found');
      return ResponseHandler.error(res, 'Message non trouvé', 'NOT_FOUND');
    }

    await prisma.message.update({
      where: { id },
      data: {
        isActive: true,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    console.log('Message restored successfully');
    return ResponseHandler.success(res, null, 'OK');
  } catch (error) {
    console.error('Error restoring message:', error);
    return ResponseHandler.error(res, 'Erreur lors de la restauration du message');
  }
};

// Fonctions utilitaires
function buildWhereCondition(query) {
  const {
    search = '',
    isActive,
    messageType,
    tag,
    workshopId,
    participantId,
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
      { content: { contains: search, mode: 'insensitive' } },
      { referenceNumber: { contains: search, mode: 'insensitive' } },
      { urlFile: { contains: search, mode: 'insensitive' } }
    ],
    AND: []
  };

  // Ajout des filtres booléens et autres
  if (isActive !== undefined) whereCondition.isActive = isActive === 'true';
  if (messageType) whereCondition.messageType = messageType;
  if (tag) whereCondition.tag = tag;
  if (workshopId) whereCondition.workshopId = workshopId;
  if (participantId) whereCondition.participantId = participantId;
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
    messageType,
    tag,
    workshopId,
    participantId,
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
      messageType,
      tag,
      workshopId,
      participantId,
      createdById,
      updatedById
    }
  };
}

function formatMessages(messages) {
  return messages.map(message => {
    const formattedMessage = { ...message };
    if (message.created) {
      formattedMessage.created = userResponseSerializer(message.created);
    }
    if (message.updated) {
      formattedMessage.updated = userResponseSerializer(message.updated);
    }
    if (message.participant) {
      const formattedParticipant = { ...message.participant };
      if (message.participant.participantRole) {
        formattedParticipant.participantRole = participantRoleResponseSerializer(message.participant.participantRole);
      }
      if (message.participant.owner) {
        formattedParticipant.owner = userResponseSerializer(message.participant.owner);
      }
      formattedMessage.participant = participantResponseSerializer(formattedParticipant);
    }
    return messageResponseSerializer(formattedMessage);
  });
}

function formatSingleMessage(message) {
  if (message.created) {
    message.created = userResponseSerializer(message.created);
  }
  if (message.updated) {
    message.updated = userResponseSerializer(message.updated);
  }
  return messageDetailResponseSerializer(message);
}

module.exports = exports;

