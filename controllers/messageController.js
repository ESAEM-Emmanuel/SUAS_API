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

// Fonction pour créer un nouvel message
exports.createMessage = async (req, res) => {
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
      return res.status(400).json({ error: error.details[0].message });
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.message);
    console.log(referenceNumber);

    // Création de l'événement avec Prisma
    const newmessage = await prisma.message.create({
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

    // Réponse avec l'événement créé
    return res.status(201).json(newmessage);
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer tous les messages avec pagination
exports.getMessages = async (req, res) => {
  try {
    // Liste des champs de tri valides
    const validSortFields = [
      'id',
      'referenceNumber',
      'content',
      'messageType',
      'workshopId',
      'participantId',
      'createdById',
      'updatedById',
      'isActive',
      'createdAt',
      'updatedAt',
      'urlFile',
      'tag'
    ];

    // Récupération des paramètres de pagination depuis la requête
    const page = parseInt(req.query.page) || 1;
    const requestedLimit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const requestedSortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order?.toUpperCase() === 'ASC' ? 'asc' : 'desc';

    // Récupération des paramètres de filtrage supplémentaires
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const messageType = req.query.messageType || undefined;
    const tag = req.query.tag || undefined;
    const workshopId = req.query.workshopId || undefined;
    const participantId = req.query.participantId || undefined;
    const createdById = req.query.createdById || undefined;
    const updatedById = req.query.updatedById || undefined;

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
        { content: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { urlFile: { contains: search, mode: 'insensitive' } }
      ],
      AND: []
    };

    // Ajout des filtres booléens et autres
    if (isActive !== undefined) whereCondition.isActive = isActive;
    if (messageType) whereCondition.messageType = messageType;
    if (tag) whereCondition.tag = tag;
    if (workshopId) whereCondition.workshopId = workshopId;
    if (participantId) whereCondition.participantId = participantId;
    if (createdById) whereCondition.createdById = createdById;
    if (updatedById) whereCondition.updatedById = updatedById;

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

    // Récupération du nombre total de messages
    const total = await prisma.message.count({ where: whereCondition });

    // Protection contre les performances
    const MAX_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_FOR_UNLIMITED_QUERY) {
      return res.status(400).json({
        error: `La récupération de tous les messages est limitée à ${MAX_FOR_UNLIMITED_QUERY} entrées. Veuillez utiliser la pagination.`
      });
    }

    // Configuration de la requête
    const findManyOptions = {
      where: whereCondition,
      orderBy: {
        [sortBy]: order
      },
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

    // Formatage des messages avec les relations
    const formattedMessages = messages.map(message => {
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
      data: formattedMessages,
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
          messageType,
          tag,
          workshopId,
          participantId,
          createdById,
          updatedById
        }
      },
      validSortFields
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer tous les messages avec pagination
exports.getMessagesInactifs = async (req, res) => {
  const { page = 1, limit = 100 } = req.query;

  try {
    const messages = await prisma.message.findMany({
      skip: (page - 1) * limit,
      take: parseInt(limit),
      where: {
        isActive: false,
      },
      orderBy: {
        createdAt: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
      },
    });

    const formattedMessages = messages.map(messageResponseSerializer);
    return res.status(200).json(formattedMessages);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer un message par son ID
exports.getMessage = async (req, res) => {
  console.log("getmessage ok");
  const { id } = req.params;

  try {
    const message = await prisma.message.findUnique({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      include: {
        created: true,
        updated: true,
        workshop: true,
        participant: true,
      },
    });

    // Vérification de l'existence de la message
    if (!message) {
      return res.status(404).json({ error: 'message non trouvé' });
    }
    if(message.created){

        message.created=userResponseSerializer(message.created);
    }
    if(message.updated){

        message.updated=userResponseSerializer(message.updated);
    }

    // Réponse avec la message trouvé
    return res.status(200).json(messageDetailResponseSerializer(message));
  } catch (error) {
    console.error('Erreur lors de la récupération de la message :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour mettre à jour un message
exports.updateMessage = async (req, res) => {
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
      return res.status(400).json({ error: error.details[0].message });
    }

    // Mise à jour de la message
    const updatedMessage = await prisma.message.update({
      where: {
        id: id,
      },
      data: {
          workshopId,
          content,
          messageType,
          participantId,
          urlFile : urlFile || null,
          updatedById: req.userId,
          updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
      }
    });

    // Récupération de la message mise à jour
    const message = await prisma.message.findUnique({
      where: {
        id: id,
      },
      include: {
          created: true,
          updated: true,
          workshop: true,
          participant: true,
      },
    });

      if (!message) {
      return res.status(404).json({ error: 'message non trouvé' });
      }
      if(message.created){

      message.created=userResponseSerializer(message.created);
      }
      if(message.updated){

          message.updated=userResponseSerializer(message.updated);
      }
    // Réponse avec la message mise à jour
    return res.status(200).json(messageDetailResponseSerializer(message));
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la message :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

exports.deleteMessage = async (req, res) => {
  const { id } = req.params;

  // Recherche de l'message par nom d'message
  const queryMessage = await prisma.message.findUnique({
    where: {
      id: id,
      isActive: true
    },
  });

  // Vérification de l'message
  if (!queryMessage) {
    return res.status(404).json({ error: 'message non trouvé' });
  }

  try {
    // Mise à jour de la message pour une suppression douce
    const deletedMessage = await prisma.message.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        isActive: false,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
      },
    });

    if (!deletedMessage) {
      return res.status(404).json({ error: 'message non trouvé' });
    }

    // Réponse de suppression réussie
    return res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de la message :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour restorer un message
exports.restoreMessage = async (req, res) => {
  const { id } = req.params;

  // Recherche de l'message par nom d'message
  const queryMessage = await prisma.message.findUnique({
    where: {
      id: id,
      isActive: false
    },
  });

  // Vérification de l'message
  if (!queryMessage) {
    return res.status(404).json({ error: 'message non trouvé' });
  }

  try {
    // Mise à jour de la message pour une suppression douce
    const restoredMessage = await prisma.message.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        isActive: true,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
      },
    });

    if (!restoredMessage) {
      return res.status(404).json({ error: 'message non trouvé' });
    }

    // Réponse de suppression réussie
    return res.status(200).send();
  } catch (error) {
    console.error('Erreur lors de la restauration de la message :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Export des fonctions du contrôleur
module.exports = exports;

