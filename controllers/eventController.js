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

// Fonction pour créer un nouvel Event
exports.createEvent = async (req, res) => {
  // Extraction des données de la requête
  const { categoryId, name, photo, description, startDate, endDate, ownerId, isPublic } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = eventCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Vérification des contraintes d'unicité
    const existingPhotoEvent = await prisma.event.findFirst({
      where: { photo }
    });
    if (existingPhotoEvent) {
      return res.status(400).json({ error: 'Please change the event image!' });
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.event);
    console.log(referenceNumber);

    // S'assurer que startDate et endDate ne contiennent que la date (sans heure)
    const formattedStartDate = new Date(startDate);
    formattedStartDate.setHours(0, 0, 0, 0);

    const formattedEndDate = new Date(endDate);
    formattedEndDate.setHours(23, 59, 59, 999);

    // Comparer les dates
    if (formattedEndDate < formattedStartDate) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Création de l'événement avec Prisma
    const newEvent = await prisma.event.create({
      data: {
        categoryId,
        name,
        photo,
        description,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        ownerId,
        referenceNumber,
        isActive: true,
        isPublic:isPublic|| false,
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
      },
    });

    // Réponse avec l'événement créé
    return res.status(201).json(newEvent);
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer tous les Events avec pagination
exports.getEventsByOwner = async (req, res) => {
  const { page = 1, limit = 100 } = req.query;
  const { id } = req.params;

  try {
    const events = await prisma.event.findMany({
      where: {
        owner: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        isActive: true,
      },
      include: {
        workshops: true,
        category: true,
        owner: true,
        masterOfCeremonies: true,
      },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
      }
    });

    // Formater les objets imbriqués
    const formattedEvents = events.map(event => {
      if (event.owner) {
        event.owner = userResponseSerializer(event.owner);
      }
      if (event.masterOfCeremonies) {
        event.masterOfCeremonies = event.masterOfCeremonies.map(mc => userResponseSerializer(mc));
      }
      return eventResponseSerializer(event);
    });

    return res.status(200).json(formattedEvents);
  } catch (error) {
    console.error('Erreur lors de la récupération des Events :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer tous les Events avec pagination
exports.getEvents = async (req, res) => {
  try {
    // Liste des champs de tri valides
    const validSortFields = [
      'id',
      'referenceNumber',
      'name',
      'description',
      'photo',
      'startDate',
      'endDate',
      'isApproved',
      'approvedAt',
      'createdById',
      'updatedById',
      'approvedById',
      'ownerId',
      'categoryId',
      'isActive',
      'createdAt',
      'updatedAt',
      'isPublic'
    ];

    // Récupération des paramètres de pagination depuis la requête
    const page = parseInt(req.query.page) || 1;
    const requestedLimit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const requestedSortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order?.toUpperCase() === 'ASC' ? 'asc' : 'desc';

    // Récupération des paramètres de filtrage supplémentaires
    const isPublic = req.query.isPublic !== undefined ? req.query.isPublic === 'true' : undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const createdById = req.query.createdById || undefined;
    const updatedById = req.query.updatedById || undefined;
    const approvedById = req.query.approvedById || undefined;
    const categoryId = req.query.categoryId || undefined;
    const ownerId = req.query.ownerId || undefined;

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
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } }
      ],
      AND: []
    };

    // Ajout des filtres booléens et autres
    if (isActive !== undefined) whereCondition.isActive = isActive;
    if (isPublic !== undefined) whereCondition.isPublic = isPublic;
    if (createdById) whereCondition.createdById = createdById;
    if (updatedById) whereCondition.updatedById = updatedById;
    if (approvedById) whereCondition.approvedById = approvedById;
    if (ownerId) whereCondition.ownerId = ownerId;
    if (categoryId) whereCondition.categoryId = categoryId;

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

    // Récupération du nombre total d'events
    const total = await prisma.event.count({ where: whereCondition });

    // Protection contre les performances
    const MAX_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_FOR_UNLIMITED_QUERY) {
      return res.status(400).json({
        error: `La récupération de tous les events est limitée à ${MAX_FOR_UNLIMITED_QUERY} événements. Veuillez utiliser la pagination.`
      });
    }

    // Configuration de la requête
    const findManyOptions = {
      where: whereCondition,
      orderBy: {
        [sortBy]: order
      },
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
      data: formattedEvents,
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
          isPublic,
          isActive,
          ownerId,
          createdById,
          updatedById,
          approvedById,
          categoryId
        }
      },
      validSortFields
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
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
      },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      where: {
        isActive: false,
      },
      orderBy: {
        name: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
      }
    });

    // Formater les objets imbriqués
    const formattedEvents = events.map(event => {
      if (event.owner) {
        event.owner = userResponseSerializer(event.owner);
      }
      if (event.masterOfCeremonies) {
        event.masterOfCeremonies = event.masterOfCeremonies.map(mc => userResponseSerializer(mc));
      }
      return eventResponseSerializer(event);
    });

    return res.status(200).json(formattedEvents);
  } catch (error) {
    console.error('Erreur lors de la récupération des Events :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer un Event par son ID
exports.getEvent = async (req, res) => {
  console.log("getEvent ok");
  const { id } = req.params;

  try {
    const event = await prisma.event.findUnique({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      include: {
        created: true,
        updated: true,
        approved: true,
        owner: true,
        category: true,
        workshops: {
          include: {
            owner: true // Inclut le détail du propriétaire du workshop
          }
        },
        masterOfCeremonies: true,
      }
    });

    // Vérification de l'existence de l'event
    if (!event) {
      return res.status(404).json({ error: 'Event non trouvé' });
    }

    if(event.owner){
      event.owner=userResponseSerializer(event.owner);
    }
    if(event.created){
      event.created=userResponseSerializer(event.created);
    }
    if(event.updated){
      event.updated=userResponseSerializer(event.updated);
    }
    if(event.approved){
      event.approved=userResponseSerializer(event.approved);
    }

    // Sérialisation des détails de l'event
    const serializedEvent = {
      ...event,
      workshops: event.workshops.map(workshop => ({
        ...workshop,
        owner: workshop.owner ? {
          id: workshop.owner.id,
          username: workshop.owner.username,
          referenceNumber: workshop.owner.referenceNumber,
          email: workshop.owner.email,
          phone: workshop.owner.phone,
          name: workshop.owner.name,
          surname: workshop.owner.surname,
          photo: workshop.owner.photo,
          gender: workshop.owner.gender,
          userRoleId: workshop.owner.userRoleId,
          isStaff: workshop.owner.isStaff,
          isAdmin: workshop.owner.isAdmin,
          isOwner: workshop.owner.isOwner,
          isActive: workshop.owner.isActive,
          createdBy: workshop.owner.createdBy,
          updatedBy: workshop.owner.updatedBy
        } : null
      }))
    };

    // Réponse avec l'event sérialisé
    return res.json(serializedEvent);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'événement:", error);
    return res.status(500).json({ error: 'Une erreur est survenue lors de la récupération de l\'événement.' });
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
  } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = eventCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // S'assurer que startDate et endDate ne contiennent que la date (sans heure)
    const formattedStartDate = new Date(startDate);
    formattedStartDate.setHours(0, 0, 0, 0);

    const formattedEndDate = new Date(endDate);
    formattedEndDate.setHours(23, 59, 59, 999);

    // Comparer les dates
    if (formattedEndDate < formattedStartDate) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Mise à jour de la Event
    const updatedEvent = await prisma.event.update({
      where: {
        id: id,
      },
      data: {
        categoryId,
        name,
        photo,
        description,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        ownerId,
        isPublic:isPublic|| false,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
      },
      include: {
        created: true,
        updated: true,
        approved: true,
        owner: true,
        category: true,
        workshops: true,
        masterOfCeremonies: true,
      },
    });

    // Récupération de la Event mise à jour
    const event = await prisma.event.findUnique({
      where: {
        id: id,
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event non trouvé' });
    }
    if(event.created){
      event.created=userResponseSerializer(event.created);
    }
    if(event.updated){
      event.updated=userResponseSerializer(event.updated);
    }
    if(event.approved){
      event.approved=userResponseSerializer(event.approved);
    }
    if(event.owner){
      event.owner=userResponseSerializer(event.owner);
    }

    // Réponse avec la Event mise à jour
    return res.status(200).json(eventDetailResponseSerializer(event));
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la Event :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour approuver un Event
exports.approvedEvent = async (req, res) => {
  const { id } = req.params;
  // Recherche de l'Event par nom d'Event
  const queryEvent = await prisma.event.findUnique({
    where: {
      id:id,
      isActive:true
    },
  });

  // Vérification de l'Event
  if (!queryEvent) {
    return res.status(404).json({ error: 'Event non trouvé' });
  }

  try {
    // Mise à jour de la Event pour une suppression douce
    const approvedEvent = await prisma.event.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        isApproved: true,
        approvedById: req.userId,
        approvedAt: DateTime.now().toJSDate(),
      },
    });

    if (!approvedEvent) {
      return res.status(404).json({ error: 'Event non trouvé' });
    }

    // Réponse de suppression réussie
    return res.status(200).send();
  } catch (error) {
    console.error('Erreur lors de l\' approbation de la Event :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour supprimer un Event
exports.deleteEvent = async (req, res) => {
  const { id } = req.params;

  // Recherche de l'Event par nom d'Event
  const queryEvent = await prisma.event.findUnique({
    where: {
      id: id,
      isActive: true
    },
  });

  // Vérification de l'Event
  if (!queryEvent) {
    return res.status(404).json({ error: 'Event non trouvé' });
  }

  try {
    // Mise à jour de la Event pour une suppression douce
    const deletedEvent = await prisma.event.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        isActive: false,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
      },
    });

    if (!deletedEvent) {
      return res.status(404).json({ error: 'Event non trouvé' });
    }

    // Réponse de suppression réussie
    return res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de la Event :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour restaurer un Event
exports.restoreEvent = async (req, res) => {
  const { id } = req.params;

  // Recherche de l'Event par nom d'Event
  const queryEvent = await prisma.event.findUnique({
    where: {
      id: id,
      isActive: false
    },
  });

  // Vérification de l'Event
  if (!queryEvent) {
    return res.status(404).json({ error: 'Event non trouvé' });
  }

  try {
    // Mise à jour de la Event pour une suppression douce
    const restoredEvent = await prisma.event.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        isActive: true,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
      },
    });

    if (!restoredEvent) {
      return res.status(404).json({ error: 'Event non trouvé' });
    }

    // Réponse de suppression réussie
    return res.status(200).send();
  } catch (error) {
    console.error('Erreur lors de la restauration de la Event :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Export des fonctions du contrôleur
module.exports = exports;