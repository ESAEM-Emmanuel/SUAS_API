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

// Fonction pour créer un nouvel participant
exports.createParticipant = async (req, res) => {
  // Extraction des données de la requête
  const { 
    workshopId,
    name,
    photo,
    description,
    participantRoleId,
    ownerId } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = participantCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Vérification des contraintes d'unicité
    const existingParticipant = await prisma.participant.findFirst({
      where: { 
        workshopId,
        ownerId,
     }
    });
    if (existingParticipant) {
      return res.status(400).json({ error: 'The participant also exist!' });
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.participant);
    console.log(referenceNumber);

    // Création de l'événement avec Prisma
    const newParticipant = await prisma.participant.create({
      data: {
        workshopId,
        name,
        photo: photo || null,
        description,
        participantRoleId,
        ownerId,
        isOnlineParticipation: false,
        referenceNumber,
        isActive: true,
        isActiveMicrophone: false,
        isHandRaised: false,
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
      },
    });

    // Réponse avec l'événement créé
    return res.status(201).json(newParticipant);
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer tous les participants avec pagination
exports.getParticipants = async (req, res) => {
  try {
    // Liste des champs de tri valides
    const validSortFields = [
      'id',
      'referenceNumber',
      'name',
      'description',
      'participantRoleId',
      'isApproved',
      'approvedAt',
      'createdById',
      'updatedById',
      'approvedById',
      'workshopId',
      'ownerId',
      'isActive',
      'createdAt',
      'updatedAt',
      'isOnlineParticipation',
      'isActiveMicrophone',
      'isHandRaised',
      'photo'
    ];

    // Récupération des paramètres de pagination depuis la requête
    const page = parseInt(req.query.page) || 1;
    const requestedLimit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const requestedSortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order?.toUpperCase() === 'ASC' ? 'asc' : 'desc';

    // Récupération des paramètres de filtrage supplémentaires
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const isApproved = req.query.isApproved !== undefined ? req.query.isApproved === 'true' : undefined;
    const isOnlineParticipation = req.query.isOnlineParticipation !== undefined ? req.query.isOnlineParticipation === 'true' : undefined;
    const isActiveMicrophone = req.query.isActiveMicrophone !== undefined ? req.query.isActiveMicrophone === 'true' : undefined;
    const isHandRaised = req.query.isHandRaised !== undefined ? req.query.isHandRaised === 'true' : undefined;
    const createdById = req.query.createdById || undefined;
    const updatedById = req.query.updatedById || undefined;
    const approvedById = req.query.approvedById || undefined;
    const workshopId = req.query.workshopId || undefined;
    const ownerId = req.query.ownerId || undefined;
    const participantRoleId = req.query.participantRoleId || undefined;

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
    const approvedAtStart = req.query.approvedAtStart ? new Date(req.query.approvedAtStart) : null;
    const approvedAtEnd = req.query.approvedAtEnd ? new Date(req.query.approvedAtEnd) : null;
    const createdAt = req.query.createdAt ? new Date(req.query.createdAt) : null;
    const updatedAt = req.query.updatedAt ? new Date(req.query.updatedAt) : null;
    const approvedAt = req.query.approvedAt ? new Date(req.query.approvedAt) : null;

    // Construction de la condition de recherche
    const whereCondition = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } }
      ],
      AND: []
    };

    // Ajout des filtres booléens et autres
    if (isActive !== undefined) whereCondition.isActive = isActive;
    if (isApproved !== undefined) whereCondition.isApproved = isApproved;
    if (isOnlineParticipation !== undefined) whereCondition.isOnlineParticipation = isOnlineParticipation;
    if (isActiveMicrophone !== undefined) whereCondition.isActiveMicrophone = isActiveMicrophone;
    if (isHandRaised !== undefined) whereCondition.isHandRaised = isHandRaised;
    if (createdById) whereCondition.createdById = createdById;
    if (updatedById) whereCondition.updatedById = updatedById;
    if (approvedById) whereCondition.approvedById = approvedById;
    if (workshopId) whereCondition.workshopId = workshopId;
    if (ownerId) whereCondition.ownerId = ownerId;
    if (participantRoleId) whereCondition.participantRoleId = participantRoleId;

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

    if (approvedAt) {
      whereCondition.AND.push({
        approvedAt: {
          gte: approvedAt,
          lt: new Date(approvedAt.getTime() + 24 * 60 * 60 * 1000)
        }
      });
    } else if (approvedAtStart || approvedAtEnd) {
      whereCondition.AND.push({
        approvedAt: {
          ...(approvedAtStart && { gte: approvedAtStart }),
          ...(approvedAtEnd && { lte: approvedAtEnd })
        }
      });
    }

    // Si aucune condition AND n'est ajoutée, supprimez le tableau AND
    if (whereCondition.AND.length === 0) {
      delete whereCondition.AND;
    }

    // Récupération du nombre total de participants
    const total = await prisma.participant.count({ where: whereCondition });

    // Protection contre les performances
    const MAX_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_FOR_UNLIMITED_QUERY) {
      return res.status(400).json({
        error: `La récupération de tous les participants est limitée à ${MAX_FOR_UNLIMITED_QUERY} entrées. Veuillez utiliser la pagination.`
      });
    }

    // Configuration de la requête
    const findManyOptions = {
      where: whereCondition,
      orderBy: {
        [sortBy]: order
      },
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
      data: formattedParticipants,
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
      },
      validSortFields
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des participants:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer tous les participants avec pagination
exports.getParticipantsInactifs = async (req, res) => {
  const { page = 1, limit = 100 } = req.query;

  try {
    const participants = await prisma.participant.findMany({
      skip: (page - 1) * limit,
      take: parseInt(limit),
      where: {
        isActive: false,
      },
      orderBy: {
        name: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
      },
    });

    const formatedParticipants = participants.map(participantResponseSerializer);
    return res.status(200).json(formatedParticipants);
  } catch (error) {
    console.error('Erreur lors de la récupération des participants :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer un participant par son ID
exports.getParticipant = async (req, res) => {
  console.log("getparticipant ok");
  const { id } = req.params;

  try {
    const participant = await prisma.participant.findUnique({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
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

    // Vérification de l'existence de la participant
    if (!participant) {
      return res.status(404).json({ error: 'participant non trouvé' });
    }
    if(participant.created){

        participant.created=userResponseSerializer(participant.created);
    }
    if(participant.updated){

        participant.updated=userResponseSerializer(participant.updated);
    }
    if(participant.approved){

        participant.approved=userResponseSerializer(participant.approved);
    }
    if(participant.owner){

        participant.owner=userResponseSerializer(participant.owner);
    }

    // Réponse avec la participant trouvé
    return res.status(200).json(participantDetailResponseSerializer(participant));
  } catch (error) {
    console.error('Erreur lors de la récupération de la participant :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour mettre à jour un participant
exports.updateParticipant = async (req, res) => {
  const { id } = req.params;
  const {
      eventId,
      name,
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
      return res.status(400).json({ error: error.details[0].message });
    }

    // Mise à jour de la participant
    const updatedParticipant = await prisma.participant.update({
      where: {
        id: id,
      },
      data: {
          eventId,
          name,
          photo: photo || null,
          description,
          room,
          numberOfPlaces,
          isActiveMicrophone: false,
          isHandRaised: false,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          updatedById: req.userId,
          updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
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

    // Récupération de la participant mise à jour
    const participant = await prisma.participant.findUnique({
      where: {
        id: id,
      },
    });

      if (!participant) {
      return res.status(404).json({ error: 'participant non trouvé' });
      }
      if(participant.created){

      participant.created=userResponseSerializer(participant.created);
      }
      if(participant.updated){

          participant.updated=userResponseSerializer(participant.updated);
      }
      if(participant.approved){

          participant.approved=userResponseSerializer(participant.approved);
      }
      if(participant.owner){

          participant.owner=userResponseSerializer(participant.owner);
      }
    
    // Réponse avec la participant mise à jour
    return res.status(200).json(participantDetailResponseSerializer(participant));
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la participant :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour approuver un participant
exports.approvedParticipant = async (req, res) => {
  const { id } = req.params;
  // Recherche de l'participant par nom d'participant
  const queryParticipant = await prisma.participant.findUnique({
    where: {
      id:id,
      isActive:true
    },
  });

  // Vérification de l'participant
  if (!queryParticipant) {
    return res.status(404).json({ error: 'participant non trouvé' });
  }

  try {
    // Mise à jour de la participant pour une suppression douce
    const approvedParticipant = await prisma.participant.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        isApproved: true,
        approvedById: req.userId,
        approvedAt: DateTime.now().toJSDate(),
      },
    });

    if (!approvedParticipant) {
      return res.status(404).json({ error: 'participant non trouvé' });
    }

    // Réponse de suppression réussie
    return res.status(200).send();
  } catch (error) {
    console.error('Erreur lors de l\' approbation de la participant :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour changer l'etat du microphones
exports.changeMicState = async (req, res) => {
  const { id } = req.params;

  try {
    // Recherche du participant par ID et vérification s'il est actif
    const queryParticipant = await prisma.participant.findUnique({
      where: { id: id },
    });

    // Vérification de l'existence du participant
    if (!queryParticipant || !queryParticipant.isActive) {
      return res.status(404).json({ error: 'Participant non trouvé ou inactif' });
    }

    // Mise à jour de l'état du microphone
    const updatedParticipant = await prisma.participant.update({
      where: { id: id },
      data: { isActiveMicrophone: !queryParticipant.isActiveMicrophone },
    });

    // Réponse réussie
    return res.status(200).json({ message: 'État du microphone mis à jour avec succès', participant: updatedParticipant });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'état du microphone :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour lever ou baisser la main
exports.changeHandState = async (req, res) => {
  const { id } = req.params;

  try {
    // Recherche du participant par ID et vérification s'il est actif
    const queryParticipant = await prisma.participant.findUnique({
      where: { id: id },
    });

    // Vérification de l'existence du participant
    if (!queryParticipant || !queryParticipant.isActive) {
      return res.status(404).json({ error: 'Participant non trouvé ou inactif' });
    }

    // Mise à jour de la main
    const updatedParticipant = await prisma.participant.update({
      where: { id: id },
      data: { isHandRaised: !queryParticipant.isHandRaised },
    });

    // Réponse réussie
    return res.status(200).json({ message: 'État de la main mis à jour avec succès', participant: updatedParticipant });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la main :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

exports.deleteParticipant = async (req, res) => {
  const { id } = req.params;

  // Recherche de l'participant par nom d'participant
  const queryParticipant = await prisma.participant.findUnique({
    where: {
      id: id,
      isActive: true
    },
  });

  // Vérification de l'participant
  if (!queryParticipant) {
    return res.status(404).json({ error: 'participant non trouvé' });
  }

  try {
    // Mise à jour de la participant pour une suppression douce
    const deletedParticipant = await prisma.participant.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        isActive: false,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
      },
    });

    if (!deletedParticipant) {
      return res.status(404).json({ error: 'participant non trouvé' });
    }

    // Réponse de suppression réussie
    return res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de la participant :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour restorer un participant
exports.restoreParticipant = async (req, res) => {
  const { id } = req.params;

  // Recherche de l'participant par nom d'participant
  const queryparticipant = await prisma.participant.findUnique({
    where: {
      id: id,
      isActive: false
    },
  });

  // Vérification de l'participant
  if (!queryparticipant) {
    return res.status(404).json({ error: 'participant non trouvé' });
  }

  try {
    // Mise à jour de la participant pour une suppression douce
    const restoredParticipant = await prisma.participant.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        isActive: true,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
      },
    });

    if (!restoredParticipant) {
      return res.status(404).json({ error: 'participant non trouvé' });
    }

    // Réponse de suppression réussie
    return res.status(200).send();
  } catch (error) {
    console.error('Erreur lors de la restauration de la participant :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Export des fonctions du contrôleur
module.exports = exports;