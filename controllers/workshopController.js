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

// Fonction pour créer un nouvel workshop
exports.createWorkshop = async (req, res) => {
  // Extraction des données de la requête
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
    isOnlineWorkshop,
    isPublic, } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = workshopCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Vérification des contraintes d'unicité
    const existingPhotoworkshop = await prisma.workshop.findFirst({
      where: { photo }
    });
    if (existingPhotoworkshop) {
      return res.status(400).json({ error: 'Please change the workshop image!' });
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.workshop);
    console.log(referenceNumber);
    
    // S'assurer que startDate et endDate ne contiennent que la date (sans heure)
    const formattedStartDate = new Date(startDate);
    formattedStartDate.setHours(0, 0, 0, 0);

    const formattedEndDate = new Date(endDate);
    formattedEndDate.setHours(23, 59, 59, 999);
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

    console.log("eventStartDate : " + eventStartDate);
    console.log("eventEndDate : " + eventEndDate);
    // Vérifier si les dates sont comprises entre event_start_date et event_end_date
    if (formattedStartDate < eventStartDate || formattedStartDate > eventEndDate || 
      formattedEndDate < eventStartDate || formattedEndDate > eventEndDate) {
      return res.status(400).json({ error: 'Event dates must be within the allowed event period' });
    }

    // Comparer les dates
    if (formattedEndDate < formattedStartDate) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Création de l'événement avec Prisma
    const newworkshop = await prisma.workshop.create({
      data: {
        eventId,
        name,
        photo,
        description,
        room,
        numberOfPlaces,
        price,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        referenceNumber,
        isActive: true,
        isOnlineWorkshop:isOnlineWorkshop|| false,
        isPublic:isPublic|| false,
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
      },
    });

    // Réponse avec l'événement créé
    return res.status(201).json(newworkshop);
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

  
  
  // Fonction pour récupérer tous les workshops avec pagination
  exports.getWorkshops = async (req, res) => {
    const { page = 1, limit = 100 } = req.query;
  
    try {
      const workshops = await prisma.workshop.findMany({
        skip: (page - 1) * limit,
        take: parseInt(limit),
        where: {
          isActive: true,
        },
        orderBy: {
          name: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
        },
      });
  
      const formatedworkshops = workshops.map(workshopResponseSerializer);
      return res.status(200).json(formatedworkshops);
    } catch (error) {
      console.error('Erreur lors de la récupération des workshops :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  // Fonction pour récupérer tous les workshops avec pagination
  exports.getWorkshopsInactifs = async (req, res) => {
    const { page = 1, limit = 100 } = req.query;
  
    try {
      const workshops = await prisma.workshop.findMany({
        skip: (page - 1) * limit,
        take: parseInt(limit),
        where: {
          isActive: false,
        },
        orderBy: {
          name: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
        },
      });
  
      const formatedworkshops = workshops.map(workshopResponseSerializer);
      return res.status(200).json(formatedworkshops);
    } catch (error) {
      console.error('Erreur lors de la récupération des workshops :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour récupérer un workshop par son ID
  exports.getWorkshop = async (req, res) => {
    console.log("getworkshop ok");
    const { id } = req.params;
  
    try {
      const workshop = await prisma.workshop.findUnique({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        include: {
            created: true,
            updated: true,
            approved: true,
            event: true,
            participants: true,
            messages: true,
        },
      });
  
      // Vérification de l'existence de la workshop
        if (!workshop) {
        return res.status(404).json({ error: 'workshop non trouvé' });
        }

        if (!workshop) {
        return res.status(404).json({ error: 'workshop non trouvé' });
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
  
      // Réponse avec la workshop trouvé
      return res.status(200).json(workshopDetailResponseSerializer(workshops));
    } catch (error) {
      console.error('Erreur lors de la récupération de la workshop :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour mettre à jour un workshop
  exports.updateWorkshop = async (req, res) => {
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
        isOnlineWorkshop,
        isPublic,
    } = req.body;
  
    try {
      // Validation des données d'entrée
      const { error } = workshopCreateSerializer.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // S'assurer que startDate et endDate ne contiennent que la date (sans heure)
      const formattedStartDate = new Date(startDate);
      formattedStartDate.setHours(0, 0, 0, 0);

      const formattedEndDate = new Date(endDate);
      formattedEndDate.setHours(23, 59, 59, 999);

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
      console.log("eventStartDate : " + eventStartDate);
      console.log("eventStartDate : " + eventStartDate);
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
            photo,
            description,
            room,
            numberOfPlaces,
            price,
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            isOnlineWorkshop:isOnlineWorkshop|| false,
            isPublic:isPublic|| false,
            updatedById: req.userId,
            updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
        },
        include: {
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
      return res.status(200).json(workshopDetailResponseSerializer(workshop));
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la workshop :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour approuver un workshop
  exports.approvedWorkshop = async (req, res) => {
    const { id } = req.params;
    // Recherche de l'workshop par nom d'workshop
    const queryworkshop = await prisma.workshop.findUnique({
      where: {
        id:id,
        isActive:true
      },
    });

    // Vérification de l'workshop
    if (!queryworkshop) {
      return res.status(404).json({ error: 'workshop non trouvé' });
    }
  
    try {
      // Mise à jour de la workshop pour une suppression douce
      const approvedWorkshop = await prisma.workshop.update({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        data: {
          isApproved: true,
          approvedById: req.userId,
          approvedAt: DateTime.now().toJSDate(),
        },
      });
  
      if (!approvedWorkshop) {
        return res.status(404).json({ error: 'workshop non trouvé' });
      }
  
      // Réponse de suppression réussie
      return res.status(200).send();
    } catch (error) {
      console.error('Erreur lors de l\' approbation de la workshop :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  exports.deleteWorkshop = async (req, res) => {
    const { id } = req.params;
  
    // Recherche de l'workshop par nom d'workshop
    const queryworkshop = await prisma.workshop.findUnique({
      where: {
        id: id,
        isActive: true
      },
    });
  
    // Vérification de l'workshop
    if (!queryworkshop) {
      return res.status(404).json({ error: 'workshop non trouvé' });
    }
  
    try {
      // Mise à jour de la workshop pour une suppression douce
      const deletedworkshop = await prisma.workshop.update({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        data: {
          isActive: false,
          updatedById: req.userId,
          updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
        },
      });
  
      if (!deletedworkshop) {
        return res.status(404).json({ error: 'workshop non trouvé' });
      }
  
      // Réponse de suppression réussie
      return res.status(204).send();
    } catch (error) {
      console.error('Erreur lors de la suppression de la workshop :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour restorer un workshop
  exports.restoreWorkshop = async (req, res) => {
    const { id } = req.params;
  
    // Recherche de l'workshop par nom d'workshop
    const queryworkshop = await prisma.workshop.findUnique({
      where: {
        id: id,
        isActive: false
      },
    });
  
    // Vérification de l'workshop
    if (!queryworkshop) {
      return res.status(404).json({ error: 'workshop non trouvé' });
    }
  
    try {
      // Mise à jour de la workshop pour une suppression douce
      const restoredWorkshop = await prisma.workshop.update({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        data: {
          isActive: true,
          updatedById: req.userId,
          updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
        },
      });
  
      if (!restoredWorkshop) {
        return res.status(404).json({ error: 'workshop non trouvé' });
      }
  
      // Réponse de suppression réussie
      return res.status(200).send();
    } catch (error) {
      console.error('Erreur lors de la restauration de la workshop :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };

  
  // Export des fonctions du contrôleur
  module.exports = exports;