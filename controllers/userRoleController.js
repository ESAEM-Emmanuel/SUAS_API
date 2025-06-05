const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const userRoleCreateSerializer = require('../serializers/userRoleCreateSerializer');
const userRoleResponseSerializer = require('../serializers/userRoleResponseSerializer');
const userRoleDetailResponseSerializer = require('../serializers/userRoleDetailResponseSerializer');
const userResponseSerializer = require('../serializers/userResponseSerializer');

// Fonction pour créer un nouvel userRole
exports.createUserRole = async (req, res) => {
    console.log("createuserRole");
  const { name, permissionList} = req.body;

  try {
    // Validation des données d'entrée
    const { error } = userRoleCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Vérification des contraintes d'unicité
    console.log(userRoleCreateSerializer.validate(req.body));
    const existinguserRole = await prisma.userRole.findUnique({ where: { name } });
    if (existinguserRole) {
      return res.status(400).json({ error: 'userRole already exists' });
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.userRole);
    console.log(referenceNumber);

    // Création de la userRole avec Prisma
    const newuserRole = await prisma.userRole.create({
      data: {
        name,
        permissionList,
        referenceNumber,
        isActive: true,
        createdById: req.userId,
      },
    });
    // Réponse avec la userRole créée
    return res.status(201).json(newuserRole);
  } catch (error) {
    console.error('Erreur lors de la création de la userRole :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer tous les userRoles avec pagination
exports.getUserRoles = async (req, res) => {
  try {
    // Liste des champs de tri valides
    const validSortFields = [
      'id',
      'referenceNumber',
      'name',
      'permissionList',
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
    const permission = req.query.permission || undefined;

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
    if (permission) {
      whereCondition.permissionList = {
        has: permission
      };
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

    // Si aucune condition AND n'est ajoutée, supprimez le tableau AND
    if (whereCondition.AND.length === 0) {
      delete whereCondition.AND;
    }

    // Récupération du nombre total de rôles utilisateur
    const total = await prisma.userRole.count({ where: whereCondition });

    // Protection contre les performances
    const MAX_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_FOR_UNLIMITED_QUERY) {
      return res.status(400).json({
        error: `La récupération de tous les rôles utilisateur est limitée à ${MAX_FOR_UNLIMITED_QUERY} entrées. Veuillez utiliser la pagination.`
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
        users: true
      }
    };

    // Ajouter la pagination seulement si limit n'est pas -1
    if (requestedLimit !== -1) {
      findManyOptions.skip = (page - 1) * requestedLimit;
      findManyOptions.take = requestedLimit;
    }

    // Récupération des rôles utilisateur
    const userRoles = await prisma.userRole.findMany(findManyOptions);

    // Formatage des rôles utilisateur avec les relations
    const formattedUserRoles = userRoles.map(userRole => {
      const formattedUserRole = { ...userRole };
      if (userRole.created) {
        formattedUserRole.created = userResponseSerializer(userRole.created);
      }
      if (userRole.updated) {
        formattedUserRole.updated = userResponseSerializer(userRole.updated);
      }
      if (userRole.users) {
        formattedUserRole.users = userRole.users.map(user => userResponseSerializer(user));
      }
      return userRoleResponseSerializer(formattedUserRole);
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
      data: formattedUserRoles,
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
          updatedById,
          permission
        }
      },
      validSortFields
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des rôles utilisateur:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer tous les userRoles avec pagination
exports.getuserRolesInactifs = async (req, res) => {
  const { page = 1, limit = 100 } = req.query;

  try {
    const userRoles = await prisma.userRole.findMany({
      skip: (page - 1) * limit,
      take: parseInt(limit),
      where: {
        isActive: false,
      },
      orderBy: {
        name: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
      },
    });

    const formateduserRoles = userRoles.map(userRoleResponseSerializer);
    return res.status(200).json(formateduserRoles);
  } catch (error) {
    console.error('Erreur lors de la récupération des userRoles :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer une userRole par son ID
exports.getUserRole = async (req, res) => {
  console.log("getuserRole ok");
  const { id } = req.params;

  try {
    const userRole = await prisma.userRole.findUnique({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      include: {
        created: true,
        updated: true,
        users: true,
    },
    });

    // Vérification de l'existence de la userRole
    if (!userRole) {
      return res.status(404).json({ error: 'userRole non trouvé' });
    }
    if(userRole.created){
      userRole.created=userResponseSerializer(userRole.created);
    }
    if(userRole.updated){
      userRole.updated=userResponseSerializer(userRole.updated);
    }
    if(userRole.users){
      userRole.users=userResponseSerializer(userRole.users);
    }
    

    // Réponse avec la userRole trouvé
    return res.status(200).json(userRoleDetailResponseSerializer(userRole));
  } catch (error) {
    console.error('Erreur lors de la récupération de la userRole :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour mettre à jour une userRole
exports.updateUserRole = async (req, res) => {
  console.log("updateUserRole ok");
  console.log(req.userId);
  console.log(req.user);
  const { id } = req.params;
  const {
    name,
    permissionList, // Add permissionList here
  } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = userRoleCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Mise à jour de la userRole
    const updateduserRole = await prisma.userRole.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        name,
        permissionList,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    // Récupération de la userRole mis à jour
    const userRole = await prisma.userRole.findUnique({
      where: {
        id: id,
      },
      include: {
        created: true,
        updated: true,
        users: true,
    },
    });

    if (!userRole) {
      return res.status(404).json({ error: 'userRole non trouvé' });
    }
    if(userRole.created){
      userRole.created=userResponseSerializer(userRole.created);
    }
    if(userRole.updated){
      userRole.updated=userResponseSerializer(userRole.updated);
    }
    if(userRole.users){
      userRole.users=userResponseSerializer(userRole.users);
    }

    // Réponse avec la userRole trouvé
    return res.status(200).json(userRoleDetailResponseSerializer(userRole));
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la userRole :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour supprimer une userRole
exports.deleteUserRole = async (req, res) => {
  const { id } = req.params;

  try {
    // Mise à jour de la userRole pour une suppression douce
    const deleteduserRole = await prisma.userRole.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        isActive: false,
        updatedById: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    if (!deleteduserRole) {
      return res.status(404).json({ error: 'userRole non trouvé' });
    }

    // Réponse de suppression réussie
    return res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de la userRole :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour restorer une userRole
exports.restoreUserRole = async (req, res) => {
  const { id } = req.params;

  try {
    // Vérification de l'existence de la userRole
    const restoreduserRole = await prisma.userRole.findUnique({
      where: { id: id },
    });

    if (!restoreduserRole) {
      return res.status(404).json({ error: 'userRole non trouvé' });
    }

    // Mise à jour de la userRole pour le restorer
    await prisma.userRole.update({
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
    console.error('Erreur lors de la restauration de la userRole :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Export des fonctions du contrôleur
module.exports = exports;