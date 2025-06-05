const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const permissionCreateSerializer = require('../serializers/permissionCreateSerializer');
const permissionResponseSerializer = require('../serializers/permissionResponseSerializer');
const permissionDetailResponseSerializer = require('../serializers/permissionDetailResponseSerializer');
const userResponseSerializer = require('../serializers/userResponseSerializer');

// Fonction pour créer un nouvel Permission
exports.createPermission = async (req, res) => {
  const { name} = req.body;

  try {
    // Validation des données d'entrée
    const { error } = permissionCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Vérification des contraintes d'unicité
    const existingPermission = await prisma.permission.findUnique({ where: { name } });
    if (existingPermission) {
      return res.status(400).json({ error: 'Permission already exists' });
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.permission);
    console.log(referenceNumber);

    // Création de la permission avec Prisma
    const newPermission = await prisma.permission.create({
      data: {
        name,
        referenceNumber,
        isActive: true,
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
      },
    });
    // Réponse avec la permission créée
    const formattedPermission = permissionResponseSerializer(newPermission);
    return res.status(201).json(formattedPermission);
  } catch (error) {
    console.error('Erreur lors de la création de la permission :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer tous les permissions avec pagination
exports.getPermissions = async (req, res) => {
  try {
    // Liste des champs de tri valides
    const validSortFields = [
      'id',
      'referenceNumber',
      'name',
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
        { referenceNumber: { contains: search, mode: 'insensitive' } }
      ],
      AND: []
    };

    // Ajout des filtres booléens et autres
    if (isActive !== undefined) whereCondition.isActive = isActive;
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

    // Récupération du nombre total de permissions
    const total = await prisma.permission.count({ where: whereCondition });

    // Protection contre les performances
    const MAX_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_FOR_UNLIMITED_QUERY) {
      return res.status(400).json({
        error: `La récupération de toutes les permissions est limitée à ${MAX_FOR_UNLIMITED_QUERY} entrées. Veuillez utiliser la pagination.`
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
        updated: true
      }
    };

    // Ajouter la pagination seulement si limit n'est pas -1
    if (requestedLimit !== -1) {
      findManyOptions.skip = (page - 1) * requestedLimit;
      findManyOptions.take = requestedLimit;
    }

    // Récupération des permissions
    const permissions = await prisma.permission.findMany(findManyOptions);

    // Formatage des permissions avec les relations
    const formattedPermissions = permissions.map(permission => {
      const formattedPermission = { ...permission };
      if (permission.created) {
        formattedPermission.created = userResponseSerializer(permission.created);
      }
      if (permission.updated) {
        formattedPermission.updated = userResponseSerializer(permission.updated);
      }
      return permissionResponseSerializer(formattedPermission);
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
      data: formattedPermissions,
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
          createdById,
          updatedById
        }
      },
      validSortFields
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer tous les permissions avec pagination
exports.getPermissionsInactifs = async (req, res) => {
  const { page = 1, limit = 100 } = req.query;

  try {
    const permissions = await prisma.permission.findMany({
      skip: (page - 1) * limit,
      take: parseInt(limit),
      where: {
        isActive: false,
      },
      orderBy: {
        name: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
      },
    });

    const formatedPermissions = permissions.map(permissionResponseSerializer);
    return res.status(200).json(formatedPermissions);
  } catch (error) {
    console.error('Erreur lors de la récupération des Permissions :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer une permission par son ID
exports.getPermission = async (req, res) => {
  console.log("getpermission ok");
  const { id } = req.params;

  try {
    const permission = await prisma.permission.findUnique({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      include: {
        created: true,
        updated: true,
    },
    });

    // Vérification de l'existence de la permission
    if (!permission) {
      return res.status(404).json({ error: 'Permission non trouvé' });
    }
    if(permission.created){
      permission.created=userResponseSerializer(permission.created);
    }
    if(permission.updated){
      permission.updated=userResponseSerializer(permission.updated);
    }

    // Réponse avec la permission trouvé
    return res.status(200).json(permissionDetailResponseSerializer(permission));
  } catch (error) {
    console.error('Erreur lors de la récupération de la permission :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour mettre à jour une permission
exports.updatePermission = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    
  } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = permissionCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Mise à jour de la permission
    const updatedPermission = await prisma.permission.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        name,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    // Récupération de la permission mis à jour
    const permission = await prisma.permission.findUnique({
      where: {
        id: id,
      },
      include: {
        created: true,
        updated: true,
    },
    });

    if (!permission) {
      return res.status(404).json({ error: 'Permission non trouvé' });
    }
    if(permission.created){
      permission.created=userResponseSerializer(permission.created);
    }
    if(permission.updated){
      permission.updated=userResponseSerializer(permission.updated);
    }

    // Réponse avec la permission trouvé
    return res.status(200).json(permissionDetailResponseSerializer(permission));
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la permission :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour supprimer une permission
exports.deletePermission = async (req, res) => {
  const { id } = req.params;
  // Recherche de l'permission par nom d'permission
  const queryPermission = await prisma.permission.findUnique({
    where: {
      id:id,
      isActive:true
    },
  });

  // Vérification de l'permission
  if (!queryPermission) {
    return res.status(404).json({ error: 'Permission non trouvé' });
  }

  try {
    // Mise à jour de la permission pour une suppression douce
    const deletedPermission = await prisma.permission.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        isActive: false,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    if (!deletedPermission) {
      return res.status(404).json({ error: 'Permission non trouvé' });
    }

    // Réponse de suppression réussie
    return res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de la permission :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour restorer une permission
exports.restorePermission = async (req, res) => {
  const { id } = req.params;

  // Recherche de l'permission par nom d'permission
  const queryPermission = await prisma.permission.findUnique({
    where: {
      id:id,
      isActive:false
    },
  });

  // Vérification de l'permission
  if (!queryPermission) {
    return res.status(404).json({ error: 'Permission non trouvé' });
  }

  try {
    // Vérification de l'existence de la permission
    const restoredPermission = await prisma.permission.findUnique({
      where: { id: id },
    });

    if (!restoredPermission) {
      return res.status(404).json({ error: 'Permission non trouvé' });
    }

    // Mise à jour de la permission pour le restorer
    await prisma.permission.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        isActive: true,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    // Réponse de restauration réussie
    return res.status(200).send();
  } catch (error) {
    console.error('Erreur lors de la restauration de la permission :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Export des fonctions du contrôleur
module.exports = exports;