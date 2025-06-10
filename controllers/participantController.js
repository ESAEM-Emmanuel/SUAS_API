const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const participantCreateSerializer = require('../serializers/participantCreateSerializer');
const participantResponseSerializer = require('../serializers/participantResponseSerializer');
const participantDetailResponseSerializer = require('../serializers/participantDetailResponseSerializer');
const userResponseSerializer = require('../serializers/userResponseSerializer');
const ResponseHandler = require('../utils/responseHandler');

// Fonction pour créer un nouvel participant
exports.createParticipant = async (req, res) => {
  const { 
    workshopId,
    name,
    firstName,
    companyName,
    businessSector,
    functionC,
    positionInCompany,
    photo,
    description,
    participantRoleId,
    ownerId,
    isOnlineParticipation 
  } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = participantCreateSerializer.validate(req.body);
    if (error) {
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // Vérification de l'existence du workshop
    const existingWorkshop = await prisma.workshop.findFirst({
      where: { 
        id: workshopId,
      }
    });
    
    if (!existingWorkshop) {
      return ResponseHandler.error(res, 'Cet atelier n\'existe pas.');
    }

    // Vérification de l'existence de l'eventParticipant
    let existingEventParticipant = await prisma.eventParticipant.findFirst({
      where: { 
        eventId: existingWorkshop.eventId,
        ownerId: ownerId,
      }
    });

    // Si l'eventParticipant n'existe pas, on le crée
    if (!existingEventParticipant) {
      // Récupération du rôle 'participant'
      const participantRole = await prisma.eventParticipantRole.findFirst({
        where: { 
          name: 'participant'
        }
      });

      if (!participantRole) {
        return ResponseHandler.error(res, 'Le rôle participant n\'existe pas');
      }

      // Génération du numéro de référence unique pour eventParticipant
      const eventParticipantRefNumber = await generateUniqueReferenceNumber(prisma.eventParticipant);

      // Création de l'eventParticipant
      existingEventParticipant = await prisma.eventParticipant.create({
        data: {
          eventId: existingWorkshop.eventId,
          eventParticipantRoleId: participantRole.id,
          ownerId: ownerId,
          referenceNumber: eventParticipantRefNumber,
          isActive: true,
          createdById: req.userId,
          createdAt: DateTime.now().toJSDate(),
        },
      });
    }

    // Vérification si le participant existe déjà dans le workshop
    const existingParticipant = await prisma.participant.findFirst({
      where: { 
        workshopId,
        ownerId,
      }
    });

    if (existingParticipant) {
      return ResponseHandler.error(res, 'Ce participant existe déjà dans cet atelier', 'CONFLICT');
    }

    // Génération du numéro de référence unique pour le participant
    const participantRefNumber = await generateUniqueReferenceNumber(prisma.participant);

    // Création du participant avec Prisma
    const newParticipant = await prisma.participant.create({
      data: {
        workshopId,
        name,
        firstName,
        companyName,
        businessSector,
        functionC,
        positionInCompany,
        photo: photo || null,
        description,
        participantRoleId,
        ownerId,
        isOnlineParticipation: isOnlineParticipation || false,
        referenceNumber: participantRefNumber,
        isActive: true,
        isActiveMicrophone: false,
        isHandRaised: false,
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.success(res, participantResponseSerializer(newParticipant), 'CREATED');
  } catch (error) {
    console.error('Erreur lors de la création du participant:', error);
    return ResponseHandler.error(res, 'Erreur lors de la création du participant');
  }
};

// Fonction pour récupérer tous les participants avec pagination
exports.getParticipants = async (req, res) => {
  try {
    const validSortFields = [
      'id', 'referenceNumber', 'name', 'description', 'participantRoleId',
      'isApproved', 'approvedAt', 'createdById', 'updatedById', 'approvedById',
      'workshopId', 'ownerId', 'isActive', 'createdAt', 'updatedAt',
      'isOnlineParticipation', 'isActiveMicrophone', 'isHandRaised', 'photo'
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

    // Récupération du nombre total de participants
    const total = await prisma.participant.count({ where: whereCondition });

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
        participantRole: true,
        created: true,
        updated: true,
        approved: true,
        owner: true,
        workshop: true,
        messages: true
      }
    };

    // Ajouter la pagination seulement si limit n'est pas -1
    if (requestedLimit !== -1) {
      findManyOptions.skip = (page - 1) * requestedLimit;
      findManyOptions.take = requestedLimit;
    }

    // Récupération des participants
    const participants = await prisma.participant.findMany(findManyOptions);

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
      return participantResponseSerializer(formattedParticipant);
    });

    // Préparation de la réponse
    const response = {
      data: formattedParticipants,
      pagination: buildPaginationData(total, page, requestedLimit),
      filters: buildFiltersData(req.query, sortBy, order),
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
  const { page = 1, limit = 100 } = req.query;

  try {
    const participants = await prisma.participant.findMany({
      skip: (page - 1) * limit,
      take: parseInt(limit),
      where: { isActive: false },
      orderBy: { name: 'asc' },
    });

    const formattedParticipants = participants.map(participantResponseSerializer);
    return ResponseHandler.success(res, formattedParticipants);
  } catch (error) {
    console.error('Erreur lors de la récupération des participants inactifs:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des participants inactifs');
  }
};

// Fonction pour récupérer un participant par son ID
exports.getParticipant = async (req, res) => {
  const { id } = req.params;

  try {
    const participant = await prisma.participant.findUnique({
      where: { id },
      include: {
        participantRole: true,
        created: true,
        updated: true,
        approved: true,
        owner: true,
        workshop: true,
        messages: true,
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

    return ResponseHandler.success(res, participantDetailResponseSerializer(participant));
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
    const { error } = participantCreateSerializer.validate(req.body);
    if (error) {
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // Mise à jour du participant
    await prisma.participant.update({
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
        participantRole: true,
        created: true,
        updated: true,
        approved: true,
        owner: true,
        workshop: true,
        messages: true,
      },
    });

    // Récupération du participant mis à jour
    const participant = await prisma.participant.findUnique({
      where: { id },
      include: {
        participantRole: true,
        created: true,
        updated: true,
        approved: true,
        owner: true,
        workshop: true,
        messages: true,
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

    return ResponseHandler.success(res, participantDetailResponseSerializer(participant));
  } catch (error) {
    console.error('Erreur lors de la mise à jour du participant:', error);
    return ResponseHandler.error(res, 'Erreur lors de la mise à jour du participant');
  }
};

// Fonction pour approuver un participant
exports.approvedParticipant = async (req, res) => {
  const { id } = req.params;

  try {
    const participant = await prisma.participant.findUnique({
      where: {
        id,
        isActive: true
      },
    });

    if (!participant) {
      return ResponseHandler.error(res, 'Participant non trouvé', 'NOT_FOUND');
    }

    await prisma.participant.update({
      where: { id },
      data: {
        isApproved: true,
        approvedById: req.userId,
        approvedAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.success(res, null, 'OK');
  } catch (error) {
    console.error('Erreur lors de l\'approbation du participant:', error);
    return ResponseHandler.error(res, 'Erreur lors de l\'approbation du participant');
  }
};

// Fonction pour changer l'etat du microphones
exports.changeMicState = async (req, res) => {
  const { id } = req.params;

  try {
    const participant = await prisma.participant.findUnique({
      where: { id },
    });

    if (!participant || !participant.isActive) {
      return ResponseHandler.error(res, 'Participant non trouvé ou inactif', 'NOT_FOUND');
    }

    const updatedParticipant = await prisma.participant.update({
      where: { id },
      data: { isActiveMicrophone: !participant.isActiveMicrophone },
    });

    return ResponseHandler.success(res, {
      message: 'État du microphone mis à jour avec succès',
      participant: updatedParticipant
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'état du microphone:', error);
    return ResponseHandler.error(res, 'Erreur lors de la mise à jour de l\'état du microphone');
  }
};

// Fonction pour lever ou baisser la main
exports.changeHandState = async (req, res) => {
  const { id } = req.params;

  try {
    const participant = await prisma.participant.findUnique({
      where: { id },
    });

    if (!participant || !participant.isActive) {
      return ResponseHandler.error(res, 'Participant non trouvé ou inactif', 'NOT_FOUND');
    }

    const updatedParticipant = await prisma.participant.update({
      where: { id },
      data: { isHandRaised: !participant.isHandRaised },
    });

    return ResponseHandler.success(res, {
      message: 'État de la main mis à jour avec succès',
      participant: updatedParticipant
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'état de la main:', error);
    return ResponseHandler.error(res, 'Erreur lors de la mise à jour de l\'état de la main');
  }
};

exports.deleteParticipant = async (req, res) => {
  const { id } = req.params;

  try {
    const participant = await prisma.participant.findUnique({
      where: {
        id,
        isActive: true
      },
    });

    if (!participant) {
      return ResponseHandler.error(res, 'Participant non trouvé', 'NOT_FOUND');
    }

    await prisma.participant.update({
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
    const participant = await prisma.participant.findUnique({
      where: {
        id,
        isActive: false
      },
    });

    if (!participant) {
      return ResponseHandler.error(res, 'Participant non trouvé', 'NOT_FOUND');
    }

    await prisma.participant.update({
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
    search = '',
    isActive,
    isApproved,
    isOnlineParticipation,
    isActiveMicrophone,
    isHandRaised,
    createdById,
    updatedById,
    approvedById,
    workshopId,
    ownerId,
    participantRoleId
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
  if (isApproved !== undefined) whereCondition.isApproved = isApproved === 'true';
  if (isOnlineParticipation !== undefined) whereCondition.isOnlineParticipation = isOnlineParticipation === 'true';
  if (isActiveMicrophone !== undefined) whereCondition.isActiveMicrophone = isActiveMicrophone === 'true';
  if (isHandRaised !== undefined) whereCondition.isHandRaised = isHandRaised === 'true';
  if (createdById) whereCondition.createdById = createdById;
  if (updatedById) whereCondition.updatedById = updatedById;
  if (approvedById) whereCondition.approvedById = approvedById;
  if (workshopId) whereCondition.workshopId = workshopId;
  if (ownerId) whereCondition.ownerId = ownerId;
  if (participantRoleId) whereCondition.participantRoleId = participantRoleId;

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

  if (approvedAt) {
    const startOfDay = new Date(approvedAt);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    whereCondition.AND.push({
      approvedAt: {
        gte: startOfDay,
        lt: endOfDay
      }
    });
  } else if (approvedAtStart || approvedAtEnd) {
    whereCondition.AND.push({
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
    isOnlineParticipation,
    isActiveMicrophone,
    isHandRaised,
    workshopId,
    ownerId,
    participantRoleId,
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
      isOnlineParticipation,
      isActiveMicrophone,
      isHandRaised,
      workshopId,
      ownerId,
      participantRoleId,
      createdById,
      updatedById,
      approvedById
    }
  };
}

// Export des fonctions du contrôleur
module.exports = exports;