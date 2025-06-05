const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const categoryCreateSerializer = require('../serializers/categoryCreateSerializer');
const categoryResponseSerializer = require('../serializers/categoryResponseSerializer');
const categoryDetailResponseSerializer = require('../serializers/categoryDetailResponseSerializer');
const userResponseSerializer = require('../serializers/userResponseSerializer');

// Fonction pour créer un nouvel Category
exports.createCategory = async (req, res) => {
  const { name} = req.body;

  try {
    // Validation des données d'entrée
    const { error } = categoryCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Vérification des contraintes d'unicité
    const existingCategory = await prisma.category.findUnique({ where: { name } });
    if (existingCategory) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.category);
    console.log(referenceNumber);

    // Création de la Category avec Prisma
    const newCategory = await prisma.category.create({
      data: {
        name,
        referenceNumber,
        isActive: true,
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
      },
    });
    // Réponse avec la Category créée
    const formattedCategory = categoryResponseSerializer(newCategory);
    return res.status(201).json(formattedCategory);
  } catch (error) {
    console.error('Erreur lors de la création de la Category :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

  
  
  // Fonction pour récupérer tous les Categorys avec pagination
  exports.getCategories = async (req, res) => {
    try {
      // Liste des champs de tri valides
      const validSortFields = [
        'id',
        'referenceNumber',
        'name',
        'description',
        'photo',
        'createdById',
        'updatedById',
        'isActive',
        'createdAt',
        'updatedAt',
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
          { description: { contains: search, mode: 'insensitive' } },
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
  
      // Récupération du nombre total de category
      const total = await prisma.category.count({ where: whereCondition });
  
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
          created: true,
          updated: true,
          events: true
        }
      };
  
      // Ajouter la pagination seulement si limit n'est pas -1
      if (requestedLimit !== -1) {
        findManyOptions.skip = (page - 1) * requestedLimit;
        findManyOptions.take = requestedLimit;
      }
  
      // Récupération des categories
      const categories = await prisma.category.findMany(findManyOptions);
  
      // Formatage des categories avec les relations
      const formattedCategories = categories.map(category => {
        const formattedCategory = { ...category };
        if (category.created) {
          formattedCategory.created = userResponseSerializer(category.created);
        }
        if (category.updated) {
          formattedCategory.updated = userResponseSerializer(category.updated);
        }
        return categoryResponseSerializer(formattedCategory);
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
        data: formattedCategories,
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
      console.error('Erreur lors de la récupération des événements:', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  // Fonction pour récupérer tous les Categorys avec pagination
  exports.getCategoriesInactifs = async (req, res) => {
    const { page = 1, limit = 100 } = req.query;
  
    try {
      const categories = await prisma.category.findMany({
        skip: (page - 1) * limit,
        take: parseInt(limit),
        where: {
          isActive: false,
        },
        orderBy: {
          name: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
        },
      });
  
      const formatedCategories = categories.map(categoryResponseSerializer);
      return res.status(200).json(formatedCategories);
    } catch (error) {
      console.error('Erreur lors de la récupération des Categorys :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }

  };
  
  // Fonction pour récupérer une Category par son ID
  exports.getCategory = async (req, res) => {
    console.log("getCategory ok");
    const { id } = req.params;
  
    try {
      const category = await prisma.category.findUnique({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        include: {
          created: true,
          updated: true,
          events: true,
        },
      });
  
      // Vérification de l'existence de la Category
      if (!category) {
        return res.status(404).json({ error: 'Category non trouvé' });
      }
      if(category.created){
        category.created=userResponseSerializer(category.created);
      }
      if(category.updated){
        category.updated=userResponseSerializer(category.updated);
      }
      
      
  
      // Réponse avec la Category trouvé
      return res.status(200).json(categoryDetailResponseSerializer(category));
    } catch (error) {
      console.error('Erreur lors de la récupération de la Category :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour mettre à jour une Category
  exports.updateCategory = async (req, res) => {
    const { id } = req.params;
    const {
      name,
      
    } = req.body;
  
    try {
      // Validation des données d'entrée
      const { error } = categoryCreateSerializer.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
  
      // Mise à jour de la Category
      const updatedCategory = await prisma.category.update({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        data: {
          name,
          updatedById: req.userId,
          updatedAt: DateTime.now().toJSDate(),
        },
      });
  
      // Récupération de la Category mis à jour
      const category = await prisma.category.findUnique({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        include: {
          created: true,
          updated: true,
          events: true,
        },
      });
  
      // Vérification de l'existence de la Category
      if (!category) {
        return res.status(404).json({ error: 'Category non trouvé' });
      }
      if(category.created){
        category.created=userResponseSerializer(category.created);
      }
      if(category.updated){
        category.updated=userResponseSerializer(category.updated);
      }
  
      // Réponse avec la Category trouvé
      return res.status(200).json(categoryDetailResponseSerializer(category));
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la Category :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour supprimer une Category
  exports.deleteCategory = async (req, res) => {
    const { id } = req.params;
    // Recherche de l'Category par nom d'Category
    const category = await prisma.category.findUnique({
      where: {
        id:id,
        isActive:true
      },
    });

    // Vérification de l'Category
    if (!category) {
      return res.status(404).json({ error: 'Category non trouvé' });
    }
  
    try {
      // Mise à jour de la Category pour une suppression douce
      const deletedCategory = await prisma.category.update({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        data: {
          isActive: false,
          updatedById: req.userId,
          updatedAt: DateTime.now().toJSDate(),
        },
      });
  
      if (!deletedCategory) {
        return res.status(404).json({ error: 'Category non trouvé' });
      }
  
      // Réponse de suppression réussie
      return res.status(204).send();
    } catch (error) {
      console.error('Erreur lors de la suppression de la Category :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour restorer une Category
  exports.restoreCategory = async (req, res) => {
    const { id } = req.params;

    // Recherche de l'Category par nom d'Category
    const queryCategory = await prisma.category.findUnique({
      where: {
        id:id,
        isActive:false
      },
    });

    // Vérification de l'Category
    if (!queryCategory) {
      return res.status(404).json({ error: 'Category non trouvé' });
    }
  
    try {
      // Vérification de l'existence de la Category
      const restoredCategory = await prisma.category.findUnique({
        where: { id: id },
      });
  
      if (!restoredCategory) {
        return res.status(404).json({ error: 'Category non trouvé' });
      }
  
      // Mise à jour de la Category pour le restorer
      await prisma.category.update({
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
      console.error('Erreur lors de la restauration de la Category :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Export des fonctions du contrôleur
  module.exports = exports;