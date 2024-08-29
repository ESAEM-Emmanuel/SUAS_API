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
    const { page = 1, limit = 100 } = req.query;
  
    try {
      const masterOfCeremonys = await prisma.masterOfCeremony.findMany({
        skip: (page - 1) * limit,
        take: parseInt(limit),
        where: {
          isActive: true,
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