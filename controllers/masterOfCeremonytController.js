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

// Fonction pour créer un nouvel masterOfCeremony
exports.createMasterOfCeremony = async (req, res) => {
  // Extraction des données de la requête
  const { 
    eventId,
    ownerId,
    name,
    description,} = req.body;

  try {
    // Validation des données d'entrée
    const { error } = masterOfCeremonyCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Vérification des contraintes d'unicité
    const existingMasterOfCeremony = await prisma.masterOfCeremony.findFirst({
      where: { 
        eventId,
        ownerId,
     }
    });
    if (existingMasterOfCeremony) {
      return res.status(400).json({ error: 'The masterOfCeremony also exist!' });
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.masterOfCeremony);
    console.log(referenceNumber);

    // Création de du MOF avec Prisma
    const newmasterOfCeremony = await prisma.masterOfCeremony.create({
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

    // Réponse avec l'événement créé
    return res.status(201).json(newmasterOfCeremony);
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer tous les masterOfCeremonys avec pagination
exports.getMasterOfCeremonys = async (req, res) => {
  try {
    // Liste des champs de tri valides
    const validSortFields = [
      'id',
      'referenceNumber',
      'name',
      'description',
      'eventId',
      'ownerId',
      'createdById',
      'updatedById',
      'isActive',
      'createdAt',
      'updatedAt'
    ];

    // Récupération des paramètres de pagination depuis la requête
    const page = parseInt(req.query.page) || 1;
    const requestedLimit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const requestedSortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order?.toUpperCase() === 'ASC' ? 'asc' : 'desc';

    // Récupération des paramètres de filtrage supplémentaires
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const createdById = req.query.createdById || undefined;
    const updatedById = req.query.updatedById || undefined;
    const eventId = req.query.eventId || undefined;
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
    if (createdById) whereCondition.createdById = createdById;
    if (updatedById) whereCondition.updatedById = updatedById;
    if (eventId) whereCondition.eventId = eventId;
    if (ownerId) whereCondition.ownerId = ownerId;

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

    // Récupération du nombre total de maîtres de cérémonie
    const total = await prisma.masterOfCeremony.count({ where: whereCondition });

    // Protection contre les performances
    const MAX_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_FOR_UNLIMITED_QUERY) {
      return res.status(400).json({
        error: `La récupération de tous les maîtres de cérémonie est limitée à ${MAX_FOR_UNLIMITED_QUERY} entrées. Veuillez utiliser la pagination.`
      });
    }

    // Configuration de la requête
    const findManyOptions = {
      where: whereCondition,
      orderBy: {
        [sortBy]: order
      },
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
      data: formattedMasterOfCeremonies,
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
          eventId,
          ownerId,
          createdById,
          updatedById
        }
      },
      validSortFields
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des maîtres de cérémonie:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer tous les masterOfCeremonys avec pagination
exports.getMasterOfCeremonysInactifs = async (req, res) => {
  const { page = 1, limit = 100 } = req.query;

  try {
    const masterOfCeremonys = await prisma.masterOfCeremony.findMany({
      skip: (page - 1) * limit,
      take: parseInt(limit),
      where: {
        isActive: false,
      },
      orderBy: {
        name: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
      },
    });

    const formatedmasterOfCeremonys = masterOfCeremonys.map(masterOfCeremonyResponseSerializer);
    return res.status(200).json(formatedmasterOfCeremonys);
  } catch (error) {
    console.error('Erreur lors de la récupération des masterOfCeremonys :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer un masterOfCeremony par son ID
exports.getMasterOfCeremony = async (req, res) => {
  console.log("getmasterOfCeremony ok");
  const { id } = req.params;

  try {
    const masterOfCeremony = await prisma.masterOfCeremony.findUnique({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      include: {
          created: true,
          updated: true,
          owner: true,
          event: true,
      },
    });

    // Vérification de l'existence de la masterOfCeremony
    if (!masterOfCeremony) {
      return res.status(404).json({ error: 'masterOfCeremony non trouvé' });
    }
    if(masterOfCeremony.created){

        masterOfCeremony.created=userResponseSerializer(masterOfCeremony.created);
    }
    if(masterOfCeremony.updated){

        masterOfCeremony.updated=userResponseSerializer(masterOfCeremony.updated);
    }
    if(masterOfCeremony.owner){

        masterOfCeremony.owner=userResponseSerializer(masterOfCeremony.owner);
    }

    // Réponse avec la masterOfCeremony trouvé
    return res.status(200).json(masterOfCeremonyDetailResponseSerializer(masterOfCeremony));
  } catch (error) {
    console.error('Erreur lors de la récupération de la masterOfCeremony :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour mettre à jour un masterOfCeremony
exports.updateMasterOfCeremony = async (req, res) => {
  const { id } = req.params;
  const { 
    eventId,
    ownerId,
    name,
    description,} = req.body;

  try {
    // Validation des données d'entrée
    const { error } = masterOfCeremonyCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Mise à jour de la masterOfCeremony
    const masterOfCeremony = await prisma.masterOfCeremony.update({
      where: {
        id: id,
      },
      data: {
          eventId,
          ownerId,
          name,
          description,
          updatedById: req.userId,
          updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
      },
      include: {
          created: true,
          updated: true,
          owner: true,
          event: true,
      },
    });

    // Vérification de l'existence de la masterOfCeremony
    if (!masterOfCeremony) {
      return res.status(404).json({ error: 'masterOfCeremony non trouvé' });
    }
    if(masterOfCeremony.created){

        masterOfCeremony.created=userResponseSerializer(masterOfCeremony.created);
    }
    if(masterOfCeremony.updated){

        masterOfCeremony.updated=userResponseSerializer(masterOfCeremony.updated);
    }
    if(masterOfCeremony.owner){

        masterOfCeremony.owner=userResponseSerializer(masterOfCeremony.owner);
    }
    
    // Réponse avec la masterOfCeremony mise à jour
    return res.status(200).json(masterOfCeremonyDetailResponseSerializer(masterOfCeremony));
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la masterOfCeremony :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};


exports.deleteMasterOfCeremony = async (req, res) => {
  const { id } = req.params;

  // Recherche de l'masterOfCeremony par nom d'masterOfCeremony
  const queryMasterOfCeremony = await prisma.masterOfCeremony.findUnique({
    where: {
      id: id,
      isActive: true
    },
  });

  // Vérification de l'masterOfCeremony
  if (!queryMasterOfCeremony) {
    return res.status(404).json({ error: 'masterOfCeremony non trouvé' });
  }

  try {
    // Mise à jour de la masterOfCeremony pour une suppression douce
    const deletedMasterOfCeremony = await prisma.masterOfCeremony.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        isActive: false,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
      },
    });

    if (!deletedMasterOfCeremony) {
      return res.status(404).json({ error: 'masterOfCeremony non trouvé' });
    }

    // Réponse de suppression réussie
    return res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de la masterOfCeremony :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour restorer un masterOfCeremony
exports.restoremasterOfCeremony = async (req, res) => {
  const { id } = req.params;

  // Recherche de l'masterOfCeremony par nom d'masterOfCeremony
  const queryMasterOfCeremony = await prisma.masterOfCeremony.findUnique({
    where: {
      id: id,
      isActive: false
    },
  });

  // Vérification de l'masterOfCeremony
  if (!queryMasterOfCeremony) {
    return res.status(404).json({ error: 'masterOfCeremony non trouvé' });
  }

  try {
    // Mise à jour de la masterOfCeremony pour une suppression douce
    const restoredMasterOfCeremony = await prisma.masterOfCeremony.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        isActive: true,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
      },
    });

    if (!restoredMasterOfCeremony) {
      return res.status(404).json({ error: 'masterOfCeremony non trouvé' });
    }

    // Réponse de suppression réussie
    return res.status(200).send();
  } catch (error) {
    console.error('Erreur lors de la restauration de la masterOfCeremony :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};
// Export des fonctions du contrôleur
module.exports = exports;