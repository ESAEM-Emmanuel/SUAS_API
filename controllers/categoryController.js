const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const categoryCreateSerializer = require('../serializers/categoryCreateSerializer');
const categoryResponseSerializer = require('../serializers/categoryResponseSerializer');
const categoryDetailResponseSerializer = require('../serializers/categoryDetailResponseSerializer');

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
    const { page = 1, limit = 100 } = req.query;
  
    try {
      const categories = await prisma.category.findMany({
        skip: (page - 1) * limit,
        take: parseInt(limit),
        where: {
          isActive: true,
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
  
      if (!category) {
        return res.status(404).json({ error: 'Category non trouvé' });
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
    const user = await prisma.category.findUnique({
      where: {
        id:id,
        isActive:true
      },
    });

    // Vérification de l'Category
    if (!user) {
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