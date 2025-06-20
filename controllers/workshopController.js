const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const workshopCreateSerializer = require('../serializers/workshopCreateSerializer');
const workshopResponseSerializer = require('../serializers/workshopResponseSerializer');
const workshopDetailResponseSerializer = require('../serializers/workshopDetailResponseSerializer');
const userResponseSerializer = require('../serializers/userResponseSerializer');
const participantResponseSerializer = require('../serializers/participantResponseSerializer');
const participantRoleResponseSerializer = require('../serializers/participantRoleResponseSerializer');
const ResponseHandler = require('../utils/responseHandler');

// Fonction pour créer un nouvel workshop
exports.createWorkshop = async (req, res) => {
  console.log('Endpoint: POST /workshops/create');
  console.log('Request Body:', req.body);
  
  // Extraction des données de la requête
  const { 
    eventId,
    name,
    ownerId,
    photo,
    program,
    description,
    room,
    numberOfPlaces,
    price,
    startDate,
    endDate,
    isOnlineWorkshop,
    isPublic } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = workshopCreateSerializer.validate(req.body);
    if (error) {
      console.log('Validation Error:', error.details[0].message);
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // // Vérification des contraintes d'unicité
    // const existingPhotoworkshop = await prisma.workshop.findFirst({
    //   where: { photo }
    // });
    // if (existingPhotoworkshop) {
    //   console.log('Error: Workshop with this photo already exists');
    //   return ResponseHandler.error(res, 'Veuillez changer l\'image de l\'atelier !', 'CONFLICT');
    // }

    // Vérification des contraintes d'unicité
    const existingWorkshop = await prisma.workshop.findFirst({
      where: {
        OR: [
          { photo: photo },
          { program: program }
        ]
      }
    });
    
    if (existingWorkshop) {
      let errorMessage = '';
      if (existingWorkshop.program === program) {
        errorMessage += 'Ce programme est déjà utilisé';
      }
      if (existingWorkshop.photo === photo) {
        errorMessage += errorMessage ? ', ' : '';
        errorMessage += 'Cette image est déjà utilisée';
      }
      return ResponseHandler.error(res, errorMessage, 'CONFLICT');
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.workshop);
    
    // S'assurer que startDate et endDate ne contiennent que la date (sans heure)
    const formattedStartDate = startDate;
    const formattedEndDate = endDate;

    // const formattedStartDate = new Date(startDate);
    // formattedStartDate.setHours(0, 0, 0, 0);

    // const formattedEndDate = new Date(endDate);
    // formattedEndDate.setHours(23, 59, 59, 999);

    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      console.log('Error: Event not found');
      return ResponseHandler.error(res, 'Événement non trouvé', 'NOT_FOUND');
    }
    
    const eventStartDate = event.startDate;
    const eventEndDate = event.endDate;

    // Vérifier si les dates sont comprises entre event_start_date et event_end_date
    if (formattedStartDate <= eventStartDate || formattedStartDate >= eventEndDate || 
      formattedEndDate <= eventStartDate || formattedEndDate >= eventEndDate) {
      console.log('Error: Workshop dates must be within event period');
      return ResponseHandler.error(res, 'Les dates de l\'atelier doivent être comprises dans la période de l\'événement', 'BAD_REQUEST');
    }

    // Comparer les dates
    if (formattedEndDate < formattedStartDate) {
      console.log('Error: End date must be after start date');
      return ResponseHandler.error(res, 'La date de fin doit être postérieure à la date de début', 'BAD_REQUEST');
    }

    // Création de l'atelier avec Prisma
    const newWorkshop = await prisma.workshop.create({
      data: {
        eventId,
        name,
        ownerId,
        photo,
        program,
        description,
        room,
        numberOfPlaces,
        price,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        referenceNumber,
        isActive: true,
        isOnlineWorkshop: isOnlineWorkshop || false,
        isPublic: isPublic || false,
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
      },
    });

    console.log('Workshop created successfully:', newWorkshop);
    return ResponseHandler.success(res, workshopResponseSerializer(newWorkshop), 'CREATED');
  } catch (error) {
    console.error('Error creating workshop:', error);
    return ResponseHandler.error(res, 'Erreur lors de la création de l\'atelier');
  }
};

// Fonction pour récupérer tous les workshops avec pagination
exports.getWorkshops = async (req, res) => {
  console.log('Endpoint: GET /workshops');
  console.log('Query Parameters:', req.query);

  try {
    // Liste des champs de tri valides
    const validSortFields = [
      'id',
      'referenceNumber',
      'name',
      'description',
      'room',
      'numberOfPlaces',
      'price',
      'isOnlineWorkshop',
      'isApproved',
      'approvedAt',
      'startDate',
      'endDate',
      'isActive',
      'createdAt',
      'updatedAt',
      'createdById',
      'updatedById',
      'approvedById',
      'eventId',
      'isPublic',
      'accessKey',
      'ownerId',
      'status'
    ];

    // Récupération des paramètres de pagination depuis la requête
    const page = parseInt(req.query.page) || 1;
    const requestedLimit = parseInt(req.query.limit) || 100;
    const search = req.query.search || '';
    const requestedSortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order?.toUpperCase() === 'ASC' ? 'asc' : 'desc';

    // Récupération des paramètres de filtrage supplémentaires
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const isPublic = req.query.isPublic !== undefined ? req.query.isPublic === 'true' : undefined;
    const isOnlineWorkshop = req.query.isOnlineWorkshop !== undefined ? req.query.isOnlineWorkshop === 'true' : undefined;
    const isApproved = req.query.isApproved !== undefined ? req.query.isApproved === 'true' : undefined;
    const status = req.query.status || undefined;
    const createdById = req.query.createdById || undefined;
    const updatedById = req.query.updatedById || undefined;
    const approvedById = req.query.approvedById || undefined;
    const eventId = req.query.eventId || undefined;
    const ownerId = req.query.ownerId || undefined;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined;
    const minPlaces = req.query.minPlaces ? parseInt(req.query.minPlaces) : undefined;
    const maxPlaces = req.query.maxPlaces ? parseInt(req.query.maxPlaces) : undefined;

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
    const startDateStart = req.query.startDateStart ? new Date(req.query.startDateStart) : null;
    const startDateEnd = req.query.startDateEnd ? new Date(req.query.startDateEnd) : null;
    const endDateStart = req.query.endDateStart ? new Date(req.query.endDateStart) : null;
    const endDateEnd = req.query.endDateEnd ? new Date(req.query.endDateEnd) : null;
    const createdAt = req.query.createdAt ? new Date(req.query.createdAt) : null;
    const updatedAt = req.query.updatedAt ? new Date(req.query.updatedAt) : null;
    const approvedAt = req.query.approvedAt ? new Date(req.query.approvedAt) : null;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    // Construction de la condition de recherche
    const whereCondition = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { room: { contains: search, mode: 'insensitive' } }
      ],
      AND: []
    };

    // Ajout des filtres booléens et autres
    if (isActive !== undefined) whereCondition.isActive = isActive;
    if (isPublic !== undefined) whereCondition.isPublic = isPublic;
    if (isOnlineWorkshop !== undefined) whereCondition.isOnlineWorkshop = isOnlineWorkshop;
    if (isApproved !== undefined) whereCondition.isApproved = isApproved;
    if (status) whereCondition.status = status;
    if (createdById) whereCondition.createdById = createdById;
    if (updatedById) whereCondition.updatedById = updatedById;
    if (approvedById) whereCondition.approvedById = approvedById;
    if (eventId) whereCondition.eventId = eventId;
    if (ownerId) whereCondition.ownerId = ownerId;

    // Ajout des filtres de plage numérique
    if (minPrice !== undefined || maxPrice !== undefined) {
      whereCondition.AND.push({
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice })
        }
      });
    }

    if (minPlaces !== undefined || maxPlaces !== undefined) {
      whereCondition.AND.push({
        numberOfPlaces: {
          ...(minPlaces !== undefined && { gte: minPlaces }),
          ...(maxPlaces !== undefined && { lte: maxPlaces })
        }
      });
    }

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

    if (startDate) {
      whereCondition.AND.push({
        startDate: {
          gte: startDate,
          lt: new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
        }
      });
    } else if (startDateStart || startDateEnd) {
      whereCondition.AND.push({
        startDate: {
          ...(startDateStart && { gte: startDateStart }),
          ...(startDateEnd && { lte: startDateEnd })
        }
      });
    }

    if (endDate) {
      whereCondition.AND.push({
        endDate: {
          gte: endDate,
          lt: new Date(endDate.getTime() + 24 * 60 * 60 * 1000)
        }
      });
    } else if (endDateStart || endDateEnd) {
      whereCondition.AND.push({
        endDate: {
          ...(endDateStart && { gte: endDateStart }),
          ...(endDateEnd && { lte: endDateEnd })
        }
      });
    }

    // Si aucune condition AND n'est ajoutée, supprimez le tableau AND
    if (whereCondition.AND.length === 0) {
      delete whereCondition.AND;
    }

    // Récupération du nombre total de workshops
    const total = await prisma.workshop.count({ where: whereCondition });

    // Protection contre les performances
    const MAX_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_FOR_UNLIMITED_QUERY) {
      return res.status(400).json({
        error: `La récupération de tous les workshops est limitée à ${MAX_FOR_UNLIMITED_QUERY} entrées. Veuillez utiliser la pagination.`
      });
    }

    // Configuration de la requête
    const findManyOptions = {
      where: whereCondition,
      orderBy: {
        [sortBy]: order
      },
      include: {
        event: true,
        owner: true,
        created: true,
        updated: true,
        approved: true,
        participants: {
          include: {
            participantRole: true,
            owner: true
          }
        },
        messages: true
      }
    };

    // Ajouter la pagination seulement si limit n'est pas -1
    if (requestedLimit !== -1) {
      findManyOptions.skip = (page - 1) * requestedLimit;
      findManyOptions.take = requestedLimit;
    }

    // Récupération des workshops
    const workshops = await prisma.workshop.findMany(findManyOptions);

    // Formatage des workshops avec les relations
    const formattedWorkshops = workshops.map(workshop => {
      const formattedWorkshop = { ...workshop };
      if (workshop.owner) {
        formattedWorkshop.owner = userResponseSerializer(workshop.owner);
      }
      if (workshop.created) {
        formattedWorkshop.created = userResponseSerializer(workshop.created);
      }
      if (workshop.updated) {
        formattedWorkshop.updated = userResponseSerializer(workshop.updated);
      }
      if (workshop.approved) {
        formattedWorkshop.approved = userResponseSerializer(workshop.approved);
      }
      if (workshop.participants) {
        formattedWorkshop.participants = workshop.participants.map(participant => {
          const formattedParticipant = { ...participant };
          if (participant.participantRole) {
            formattedParticipant.participantRole = participantRoleResponseSerializer(participant.participantRole);
          }
          if (participant.owner) {
            formattedParticipant.owner = userResponseSerializer(participant.owner);
          }
          return participantResponseSerializer(formattedParticipant);
        });
      }
      return workshopResponseSerializer(formattedWorkshop);
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

    console.log('Workshops retrieved successfully:', formattedWorkshops);
    return ResponseHandler.success(res, {
      data: formattedWorkshops,
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
          approvedAtEnd,
          startDate,
          startDateStart,
          startDateEnd,
          endDate,
          endDateStart,
          endDateEnd
        },
        ranges: {
          price: {
            min: minPrice,
            max: maxPrice
          },
          places: {
            min: minPlaces,
            max: maxPlaces
          }
        },
        attributes: {
          isActive,
          isPublic,
          isOnlineWorkshop,
          isApproved,
          status,
          eventId,
          ownerId,
          createdById,
          updatedById,
          approvedById
        }
      },
      validSortFields
    });
  } catch (error) {
    console.error('Error retrieving workshops:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des ateliers');
  }
};

// Fonction pour récupérer tous les workshops avec pagination
exports.getWorkshopsInactifs = async (req, res) => {
  const { page = 1, limit = 100 } = req.query;

  try {
    const workshops = await prisma.workshop.findMany({
      include: {
        owner: true,
        created: true,
        approved: true,
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
    const formattedWorkshops = workshops.map(workshop => {
      if (workshop.owner) {
        workshop.owner = userResponseSerializer(workshop.owner);
      }
      if (workshop.created) {
        workshop.created = userResponseSerializer(workshop.created);
      }
      if (workshop.approved) {
        workshop.approved = userResponseSerializer(workshop.approved);
      }
      return workshopResponseSerializer(workshop);
    });

    return res.status(200).json(formattedWorkshops);
  } catch (error) {
    console.error('Erreur lors de la récupération des workshops :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer un workshop par son ID
exports.getWorkshop = async (req, res) => {
  console.log('Endpoint: GET /workshops/:id');
  console.log('Request Parameters:', req.params);

  const { id } = req.params;

  try {
    const workshop = await prisma.workshop.findUnique({
      where: { id },
      include: {
        owner: true,
        created: true,
        updated: true,
        approved: true,
        event: true,
        participants: {
          include: {
            participantRole: true
          }
        },
        messages: {
          include: {
            participant: true // Inclut le détail de l'utilisateur pour chaque message
          }
        },
      },
    });

    if (!workshop) {
      console.log('Error: Workshop not found');
      return ResponseHandler.error(res, 'Atelier non trouvé', 'NOT_FOUND');
    }

    // Sérialiser les informations de l'atelier
    const serializedWorkshop = {
      ...workshopDetailResponseSerializer(workshop),
      owner: workshop.owner ? userResponseSerializer(workshop.owner) : null,
      created: workshop.created ? userResponseSerializer(workshop.created) : null,
      updated: workshop.updated ? userResponseSerializer(workshop.updated) : null,
      approved: workshop.approved ? userResponseSerializer(workshop.approved) : null,
      participants: workshop.participants.map(participant => ({
        ...participantResponseSerializer(participant),
        participantRole: participant.participantRole ? participantRoleResponseSerializer(participant.participantRole) : null,
      })),
      messages: workshop.messages.map(message => ({
        ...message,
        participant: message.participant ? userResponseSerializer(message.participant) : null
      }))
    };

    console.log('Workshop retrieved successfully:', serializedWorkshop);
    return ResponseHandler.success(res, serializedWorkshop);
  } catch (error) {
    console.error('Error retrieving workshop:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération de l\'atelier');
  }
};

// Fonction pour mettre à jour un workshop
exports.updateWorkshop = async (req, res) => {
  console.log('Endpoint: PUT /workshops/:id');
  console.log('Request Parameters:', req.params);
  console.log('Request Body:', req.body);

  const { id } = req.params;
  const {
    eventId,
    name,
    ownerId,
    photo,
    program,
    description,
    room,
    numberOfPlaces,
    price,
    startDate,
    endDate,
    isOnlineWorkshop,
    isPublic,
    status
  } = req.body;

  try {
    // Validation des données d'entrée
    // const { error } = workshopCreateSerializer.validate(req.body);
    // if (error) {
    //   return res.status(400).json({ error: error.details[0].message });
    // }

    // S'assurer que startDate et endDate ne contiennent que la date (sans heure)
    const formattedStartDate = startDate;

    const formattedEndDate = endDate;
    // const formattedStartDate = new Date(startDate);
    // formattedStartDate.setHours(0, 0, 0, 0);

    // const formattedEndDate = new Date(endDate);
    // formattedEndDate.setHours(23, 59, 59, 999);

    const event = await prisma.event.findUnique({
      where: {
        id: eventId, // Assurez-vous que l'ID est utilisé tel quel (string)
      }
    })
    if (!event) {
      return res.status(404).json({ error: 'Event non trouvé' });
    }
    
    eventStartDate =event.startDate ;
    eventEndDate =event.endDate ;
    // console.log("eventStartDate : " + eventStartDate);
    // console.log("eventStartDate : " + eventStartDate);
    // Vérifier si les dates sont comprises entre event_start_date et event_end_date
    if (formattedStartDate < eventStartDate || formattedStartDate > eventEndDate || 
      formattedEndDate < eventStartDate || formattedEndDate > eventEndDate) {
      return res.status(400).json({ error: 'Event dates must be within the allowed event period' });
    }

    // Comparer les dates
    if (formattedEndDate < formattedStartDate) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Mise à jour de la workshop
    const updatedworkshop = await prisma.workshop.update({
      where: {
        id: id,
      },
      data: {
          eventId,
          name,
          ownerId,
          photo,
          program,
          description,
          room,
          numberOfPlaces,
          price,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          isOnlineWorkshop:isOnlineWorkshop|| false,
          isPublic:isPublic|| false,
          updatedById: req.userId,
          status,
          updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
      },
      include: {
          owner: true,
          created: true,
          updated: true,
          approved: true,
          event: true,
          participants: true,
          messages: true,
      },
    });

    // Récupération de la workshop mise à jour
    const workshop = await prisma.workshop.findUnique({
      where: {
        id: id,
      },
      include: {
        owner: true,
        created: true,
        updated: true,
        approved: true,
        event: true,
        participants: true,
        messages: true,
    },
    });

    if (!workshop) {
    return res.status(404).json({ error: 'workshop non trouvé' });
    }
    if(workshop.owner){

    workshop.owner=userResponseSerializer(workshop.owner);
    }
    if(workshop.created){

    workshop.created=userResponseSerializer(workshop.created);
    }
    if(workshop.updated){

        workshop.updated=userResponseSerializer(workshop.updated);
    }
    if(workshop.approved){

        workshop.approved=userResponseSerializer(workshop.approved);
    }
      

    // Réponse avec la workshop mise à jour
    console.log('Workshop updated successfully:', workshop);
    return ResponseHandler.success(res, workshopDetailResponseSerializer(workshop));
  } catch (error) {
    console.error('Error updating workshop:', error);
    return ResponseHandler.error(res, 'Erreur lors de la mise à jour de l\'atelier');
  }
};

// Fonction pour approuver un workshop
exports.approvedWorkshop = async (req, res) => {
  console.log('Endpoint: PATCH /workshops/:id/approve');
  console.log('Request Parameters:', req.params);

  const { id } = req.params;

  try {
    const workshop = await prisma.workshop.findUnique({
      where: {
        id,
        isActive: true
      },
    });

    if (!workshop) {
      console.log('Error: Workshop not found');
      return ResponseHandler.error(res, 'Atelier non trouvé', 'NOT_FOUND');
    }

    const approvedWorkshop = await prisma.workshop.update({
      where: { id },
      data: {
        isApproved: true,
        approvedById: req.userId,
        approvedAt: DateTime.now().toJSDate(),
      },
    });

    console.log('Workshop approved successfully:', approvedWorkshop);
    return ResponseHandler.success(res, null, 'OK');
  } catch (error) {
    console.error('Error approving workshop:', error);
    return ResponseHandler.error(res, 'Erreur lors de l\'approbation de l\'atelier');
  }
};

// Fonction pour modifier le statut d'un workshop
exports.changeStatusWorkshop = async (req, res) => {
  console.log('Endpoint: PATCH /workshops/:id/status');
  console.log('Request Parameters:', req.params);
  console.log('Request Body:', req.body);

  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['NOTBEGUN', 'STARTED', 'ONGOING', 'FINISHED'];

  if (!validStatuses.includes(status)) {
    console.log('Error: Invalid status');
    return ResponseHandler.error(res, 'Statut invalide; les valeurs possibles sont: NOTBEGUN, STARTED, ONGOING, FINISHED', 'BAD_REQUEST');
  }

  try {
    const workshop = await prisma.workshop.findUnique({
      where: {
        id,
        isActive: true
      },
    });

    if (!workshop) {
      console.log('Error: Workshop not found');
      return ResponseHandler.error(res, 'Atelier non trouvé', 'NOT_FOUND');
    }

    const updatedWorkshop = await prisma.workshop.update({
      where: { id },
      data: { status },
    });
    // Récupération de la workshop mise à jour
    const workshopStatus = await prisma.workshop.findUnique({
      where: {
        id: id,
      },
      include: {
        owner: true,
        created: true,
        updated: true,
        approved: true,
        event: true,
        participants: true,
        messages: true,
    },
    });

    if (!workshopStatus) {
    return res.status(404).json({ error: 'workshop non trouvé' });
    }
    if(workshopStatus.owner){

      workshopStatus.owner=userResponseSerializer(workshopStatus.owner);
    }
    if(workshopStatus.created){

      workshopStatus.created=userResponseSerializer(workshopStatus.created);
    }
    if(workshopStatus.updated){

      workshopStatus.updated=userResponseSerializer(workshopStatus.updated);
    }
    if(workshopStatus.approved){

      workshopStatus.approved=userResponseSerializer(workshopStatus.approved);
    }
      

    // Réponse avec la workshop mise à jour
    console.log('Workshop status updated successfully:', workshopStatus);
    return ResponseHandler.success(res, workshopDetailResponseSerializer(workshopStatus));
  } catch (error) {
    console.error('Error updating workshop status:', error);
    return ResponseHandler.error(res, 'Erreur lors de la mise à jour du statut de l\'atelier');
  }
};

//     console.log('Workshop status updated successfully:', updatedWorkshop);
//     return ResponseHandler.success(res, null, 'OK');
//   } catch (error) {
//     console.error('Error updating workshop status:', error);
//     return ResponseHandler.error(res, 'Erreur lors de la mise à jour du statut de l\'atelier');
//   }
// };

exports.deleteWorkshop = async (req, res) => {
  console.log('Endpoint: DELETE /workshops/:id');
  console.log('Request Parameters:', req.params);

  const { id } = req.params;

  try {
    const workshop = await prisma.workshop.findUnique({
      where: {
        id,
        isActive: true
      },
    });

    if (!workshop) {
      console.log('Error: Workshop not found');
      return ResponseHandler.error(res, 'Atelier non trouvé', 'NOT_FOUND');
    }

    const deletedWorkshop = await prisma.workshop.update({
      where: { id },
      data: {
        isActive: false,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    console.log('Workshop deleted successfully:', deletedWorkshop);
    return ResponseHandler.noContent(res);
  } catch (error) {
    console.error('Error deleting workshop:', error);
    return ResponseHandler.error(res, 'Erreur lors de la suppression de l\'atelier');
  }
};

// Fonction pour restaurer un workshop
exports.restoreWorkshop = async (req, res) => {
  console.log('Endpoint: PATCH /workshops/:id/restore');
  console.log('Request Parameters:', req.params);

  const { id } = req.params;

  try {
    const workshop = await prisma.workshop.findUnique({
      where: {
        id,
        isActive: false
      },
    });

    if (!workshop) {
      console.log('Error: Workshop not found');
      return ResponseHandler.error(res, 'Atelier non trouvé', 'NOT_FOUND');
    }

    const restoredWorkshop = await prisma.workshop.update({
      where: { id },
      data: {
        isActive: true,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    console.log('Workshop restored successfully:', restoredWorkshop);
    return ResponseHandler.success(res, null, 'OK');
  } catch (error) {
    console.error('Error restoring workshop:', error);
    return ResponseHandler.error(res, 'Erreur lors de la restauration de l\'atelier');
  }
};

// Fonction pour access key un workshop
exports.accessKeyWorkshop = async (req, res) => {
  console.log('Endpoint: PATCH /workshops/:id/access-key');
  console.log('Request Parameters:', req.params);
  console.log('Request Body:', req.body);

  const { id } = req.params;
  const { accessKey } = req.body;

  try {
    const workshop = await prisma.workshop.findUnique({
      where: {
        id,
        isActive: true
      },
    });

    if (!workshop) {
      console.log('Error: Workshop not found');
      return ResponseHandler.error(res, 'Atelier non trouvé', 'NOT_FOUND');
    }

    const updatedWorkshop = await prisma.workshop.update({
      where: { id },
      data: { accessKey },
    });

    console.log('Workshop access key updated successfully:', updatedWorkshop);
    return ResponseHandler.success(res, null, 'OK');
  } catch (error) {
    console.error('Error updating workshop access key:', error);
    return ResponseHandler.error(res, 'Erreur lors de la mise à jour de la clé d\'accès de l\'atelier');
  }
};

// Export des fonctions du contrôleur
module.exports = exports;