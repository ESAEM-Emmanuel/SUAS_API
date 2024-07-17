const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const messageCreateSerializer = require('../serializers/messageCreateSerializer');
const messageResponseSerializer = require('../serializers/messageResponseSerializer');
const messageDetailResponseSerializer = require('../serializers/messageDetailResponseSerializer');
const userResponseSerializer = require('../serializers/userResponseSerializer');

// Fonction pour créer un nouvel message
exports.createMessage = async (req, res) => {
  // Extraction des données de la requête
  const { 
    workshopId,
    content,
    messageType,
    participantId } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = messageCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Vérification des contraintes d'unicité
    // const existingmessage = await prisma.message.findFirst({
    //   where: { 
    //     workshopId,
    //     ownerId,
    //  }
    // });
    // if (existingmessage) {
    //   return res.status(400).json({ error: 'The message also exist!' });
    // }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.message);
    console.log(referenceNumber);

    // Création de l'événement avec Prisma
    const newmessage = await prisma.message.create({
      data: {
        workshopId,
        content,
        messageType,
        participantId,
        referenceNumber,
        isActive: true,
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
      },
    });

    // Réponse avec l'événement créé
    return res.status(201).json(newmessage);
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

  
  
  // Fonction pour récupérer tous les messages avec pagination
  exports.getMessages = async (req, res) => {
    const { page = 1, limit = 100 } = req.query;
  
    try {
      const messages = await prisma.message.findMany({
        skip: (page - 1) * limit,
        take: parseInt(limit),
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
        },
      });
  
      const formatedMessages = messages.map(messageResponseSerializer);
      return res.status(200).json(formatedMessages);
    } catch (error) {
      console.error('Erreur lors de la récupération des messages :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  // Fonction pour récupérer tous les messages avec pagination
  exports.getMessagesInactifs = async (req, res) => {
    const { page = 1, limit = 100 } = req.query;
  
    try {
      const messages = await prisma.message.findMany({
        skip: (page - 1) * limit,
        take: parseInt(limit),
        where: {
          isActive: false,
        },
        orderBy: {
          createdAt: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
        },
      });
  
      const formatedMessages = messages.map(messageResponseSerializer);
      return res.status(200).json(formatedMessages);
    } catch (error) {
      console.error('Erreur lors de la récupération des messages :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour récupérer un message par son ID
  exports.getMessage = async (req, res) => {
    console.log("getmessage ok");
    const { id } = req.params;
  
    try {
      const message = await prisma.message.findUnique({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        include: {
            messageRole: true,
            created: true,
            updated: true,
            approved: true,
            owner: true,
            workshop: true,
            messages: true,
        },
      });
  
      // Vérification de l'existence de la message
      if (!message) {
        return res.status(404).json({ error: 'message non trouvé' });
      }
      if(message.created){

          message.created=userResponseSerializer(message.created);
      }
      if(message.updated){

          message.updated=userResponseSerializer(message.updated);
      }
      if(message.approved){

          message.approved=userResponseSerializer(message.approved);
      }
      if(message.owner){

          message.owner=userResponseSerializer(message.owner);
      }
  
      // Réponse avec la message trouvé
      return res.status(200).json(messageDetailResponseSerializer(message));
    } catch (error) {
      console.error('Erreur lors de la récupération de la message :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour mettre à jour un message
  exports.updateMessage = async (req, res) => {
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
    } = req.body;
  
    try {
      // Validation des données d'entrée
      const { error } = messageCreateSerializer.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
  
      // Mise à jour de la message
      const updatedMessage = await prisma.message.update({
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
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            updatedById: req.userId,
            updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
        },
        include: {
            messageRole: true,
            created: true,
            updated: true,
            approved: true,
            owner: true,
            workshop: true,
            messages: true,
        },
      });
  
      // Récupération de la message mise à jour
      const message = await prisma.message.findUnique({
        where: {
          id: id,
        },
      });
  
        if (!message) {
        return res.status(404).json({ error: 'message non trouvé' });
        }
        if(message.created){

        message.created=userResponseSerializer(message.created);
        }
        if(message.updated){

            message.updated=userResponseSerializer(message.updated);
        }
        if(message.approved){

            message.approved=userResponseSerializer(message.approved);
        }
        if(message.owner){

            message.owner=userResponseSerializer(message.owner);
        }
      
      // Réponse avec la message mise à jour
      return res.status(200).json(messageDetailResponseSerializer(message));
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la message :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  exports.deleteMessage = async (req, res) => {
    const { id } = req.params;
  
    // Recherche de l'message par nom d'message
    const queryMessage = await prisma.message.findUnique({
      where: {
        id: id,
        isActive: true
      },
    });
  
    // Vérification de l'message
    if (!queryMessage) {
      return res.status(404).json({ error: 'message non trouvé' });
    }
  
    try {
      // Mise à jour de la message pour une suppression douce
      const deletedMessage = await prisma.message.update({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        data: {
          isActive: false,
          updatedById: req.userId,
          updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
        },
      });
  
      if (!deletedMessage) {
        return res.status(404).json({ error: 'message non trouvé' });
      }
  
      // Réponse de suppression réussie
      return res.status(204).send();
    } catch (error) {
      console.error('Erreur lors de la suppression de la message :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
  // Fonction pour restorer un message
  exports.restoreMessage = async (req, res) => {
    const { id } = req.params;
  
    // Recherche de l'message par nom d'message
    const queryMessage = await prisma.message.findUnique({
      where: {
        id: id,
        isActive: false
      },
    });
  
    // Vérification de l'message
    if (!queryMessage) {
      return res.status(404).json({ error: 'message non trouvé' });
    }
  
    try {
      // Mise à jour de la message pour une suppression douce
      const restoredMessage = await prisma.message.update({
        where: {
          id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
        },
        data: {
          isActive: true,
          updatedById: req.userId,
          updatedAt: DateTime.now().toJSDate(), // Utilisez DateTime.now().toJSDate() pour obtenir une date sérialisable
        },
      });
  
      if (!restoredMessage) {
        return res.status(404).json({ error: 'message non trouvé' });
      }
  
      // Réponse de suppression réussie
      return res.status(200).send();
    } catch (error) {
      console.error('Erreur lors de la restauration de la message :', error);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  // Export des fonctions du contrôleur
  module.exports = exports;