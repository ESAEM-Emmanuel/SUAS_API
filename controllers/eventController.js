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
    console.log(id);
  
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
          workshops: true,
          masterOfCeremonies: true,
        }
      });
      console.log(event);
  
      // Vérification de l'existence de la Event
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
      if(event.masterOfCeremonies){
        event.ownmasterOfCeremonieser=userResponseSerializer(event.masterOfCeremonies);
      }
  
      // Réponse avec la Event trouvé
      return res.status(200).json(eventDetailResponseSerializer(event));
    } catch (error) {
      console.error('Erreur lors de la récupération de la Event :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
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
  
  // Fonction pour restorer un Event
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