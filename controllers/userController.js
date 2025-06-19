const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const userCreateSerializer = require('../serializers/userCreateSerializer');
const userResponseSerializer = require('../serializers/userResponseSerializer');
const userDetailResponseSerializer = require('../serializers/userDetailResponseSerializer');
const ResponseHandler = require('../utils/responseHandler');

const crypto = require('crypto');
const { sendEmail } = require('../services/emailService');

exports.createUser = async (req, res) => {
  const {
    username,
    email,
    password,
    name,
    surname,
    photo,
    phone,
    gender,
    userRoleId,
    isAdmin,
    isStaff,
    isOwner,
    isActive,
  } = req.body;

  try {
    // Validation des données d'entrée
    const { error } = userCreateSerializer.validate(req.body);
    if (error) {
      return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
    }

    // Vérification de la valeur du genre
    if (gender && !['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
      return ResponseHandler.error(res, 'Le genre doit être : MALE, FEMALE, ou OTHER', 'BAD_REQUEST');
    }

    // Vérification des contraintes d'unicité
    const existingUsers = await prisma.user.findMany({
      where: {
        OR: [
          { username: username },
          { email: email },
          { phone: phone },
          { photo: photo }
        ]
      }
    });

    if (existingUsers.length) {
      const conflicts = [];
      existingUsers.forEach(user => {
        if (user.username === username) conflicts.push('Ce nom d\'utilisateur existe déjà');
        if (user.email === email) conflicts.push('Cet email existe déjà');
        if (user.phone === phone) conflicts.push('Ce numéro de téléphone existe déjà');
        if (user.photo === photo) conflicts.push('Cette photo existe déjà');
      });

      return ResponseHandler.error(res, conflicts.join(', '), 'CONFLICT');
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.user);

    // Hashage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création de l'utilisateur avec Prisma
    const newUser = await prisma.user.create({
      data: {
        username: username || null,
        referenceNumber,
        email: email || null,
        password: hashedPassword,
        name,
        surname: surname || null,
        photo: photo || null,
        phone,
        gender,
        userRoleId,
        isAdmin: isAdmin || false,
        isStaff: isStaff || false,
        isOwner: isOwner || false,
        isActive: isActive || true,
        createdById: req.userId,
        createdAt: DateTime.now().toJSDate(),
      },
    });

    // Envoi d'un email de notification à l'utilisateur rattaché si il a un email
    if (newUser && newUser.email) {
      const to = newUser.email;
      console.log('destinataire', to);
      const subject = 'Création de compte sur SUAS';
      const titre = 'Félicitations, votre compte a été créé !';
      const message = `
        Bonjour ${fullName},<br><br>
        Votre compte a été créé avec succès.<br>
        Nous vous remercions pour votre intérêt et vous souhaitons une excellente expérience.<br><br>
        Référence participant : 
        <a href="${process.env.FRONTEND_URL}"><b>Accéder au site</b></a>
        `;
      const signature = "L'équipe SUAS";
      sendEmail(to, subject, titre, message, signature).catch((err) => {
        console.error('Erreur lors de l\'envoi de l\'email de notification :', err);
      });
    }

    const formattedUser = userResponseSerializer(newUser);
    return ResponseHandler.success(res, formattedUser, 'CREATED');
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    return ResponseHandler.error(res, 'Erreur lors de la création de l\'utilisateur');
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Recherche de l'utilisateur par nom d'utilisateur
    // const user = await prisma.user.f indUnique({

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username }, // Cherche par username
          { email: username },    // Cherche par email
          { phone: username },    // Cherche par phone
        ],
      },
    });

    // Vérification de l'utilisateur
    if (!user) {
      return ResponseHandler.error(res, 'Identifiants invalides', 'UN_AUTHORIZED');
    }

    // Vérification du mot de passe
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return ResponseHandler.error(res, 'Identifiants invalides', 'UN_AUTHORIZED');
    }

    // Création du token JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1y' }
    );

    // Recherche des détails de l'utilisateur
    let current_user = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userRole: true,
        categoriesCreated: true,
        categoriesUpdated: true,
        eventsCreated: true,
        eventsUpdated: true,
        eventsApprovedBy: true,
        eventsOwner: true,
        workshopsCreatedBy: true,
        workshopsUpdatedBy: true,
        workshopsApprovedBy: true,
        workshopsOwner: true,
        participantsCreated: true,
        participantsUpdated: true,
        participantsApprovedBy: true,
        // participantsOwner: true,
        participantsOwner: {
          include: {
            participantRole: true,
            // owner: true
          }
        },
        messagesCreated: true,
        messagesUpdated: true,
        permissionsCreated: true,
        permissionsUpdated: true,
        userRolesCreated: true,
        userRolesUpdated: true,
        participantRolesCreated: true,
        participantRolesUpdated: true,
        
        eventParticipantsApprovedBy: true,
        eventParticipantsCreated: true,
        // eventParticipantsOwner: true,
        eventParticipantsOwner: {
          include: {
            eventParticipantRole: true,
            // owner: true
          }
        },
        eventParticipantsUpdated: true,
        EventParticipantRolesCreated: true,
        EventParticipantRolesUpdated: true,
      },
    });
    current_user = userDetailResponseSerializer(current_user);

    return ResponseHandler.success(res, { token, current_user });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return ResponseHandler.error(res, 'Erreur lors de la connexion');
  }
};

exports.logout = async (req, res) => {
  const { token } = req.body;

  try {
    await prisma.tokenBlacklist.create({
      data: { token },
    });

    return ResponseHandler.success(res, { message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    return ResponseHandler.error(res, 'Erreur lors de la déconnexion');
  }
};

exports.getUsers = async (req, res) => {
  try {
    const validSortFields = [
      'id', 'username', 'referenceNumber', 'email', 'phone', 'name',
      'photo', 'gender', 'isStaff', 'isAdmin', 'isOwner', 'isActive',
      'createdBy', 'updatedBy', 'userRoleId', 'createdAt', 'updatedAt', 'surname'
    ];

    // Récupération des paramètres de pagination depuis la requête
    const page = parseInt(req.query.page) || 1;
    const requestedLimit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const requestedSortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order?.toUpperCase() === 'ASC' ? 'asc' : 'desc';

    // Validation du champ de tri
    const sortBy = validSortFields.includes(requestedSortBy) ? requestedSortBy : 'createdAt';

    if (requestedSortBy && !validSortFields.includes(requestedSortBy)) {
      console.warn(`Tentative de tri sur un champ invalide: ${requestedSortBy}. Utilisation de createdAt par défaut.`);
    }

    // Validation du genre
    const gender = req.query.gender ? req.query.gender.toUpperCase() : undefined;
    if (gender && !['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
      return ResponseHandler.error(res, 'La valeur de gender doit être MALE, FEMALE ou OTHER', 'BAD_REQUEST');
    }

    // Construction des conditions de recherche et de filtrage
    const whereCondition = buildWhereCondition(req.query);

    // Récupération du nombre total d'utilisateurs
    const total = await prisma.user.count({ where: whereCondition });

    // Protection contre les performances
    const MAX_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_FOR_UNLIMITED_QUERY) {
      return ResponseHandler.error(
        res,
        `La récupération de tous les utilisateurs est limitée à ${MAX_FOR_UNLIMITED_QUERY} entrées. Veuillez utiliser la pagination.`,
        'BAD_REQUEST'
      );
    }

    // Configuration de la requête
    const findManyOptions = {
      where: whereCondition,
      orderBy: { [sortBy]: order },
      include: {
        userRole: true
      }
    };

    // Ajouter la pagination seulement si limit n'est pas -1
    if (requestedLimit !== -1) {
      findManyOptions.skip = (page - 1) * requestedLimit;
      findManyOptions.take = requestedLimit;
    }

    // Récupération des utilisateurs
    const users = await prisma.user.findMany(findManyOptions);

    // Formatage et préparation de la réponse
    const formattedUsers = users.map(user => userResponseSerializer(user));
    const response = {
      data: formattedUsers,
      pagination: buildPaginationData(total, page, requestedLimit),
      filters: buildFiltersData(req.query, sortBy, order),
      validSortFields
    };

    return ResponseHandler.success(res, response);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des utilisateurs');
  }
};

exports.getUsersInactifs = async (req, res) => {
  const { page = 1, limit = 100 } = req.query;

  try {
    const users = await prisma.user.findMany({
      skip: (page - 1) * limit,
      take: parseInt(limit),
      where: { isActive: false },
      orderBy: { name: 'asc' },
    });

    const formattedUsers = users.map(userResponseSerializer);
    return ResponseHandler.success(res, formattedUsers);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs inactifs:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération des utilisateurs inactifs');
  }
};

exports.getUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userRole: true,
        categoriesCreated: true,
        categoriesUpdated: true,
        eventsCreated: true,
        eventsUpdated: true,
        eventsApprovedBy: true,
        eventsOwner: true,
        workshopsCreatedBy: true,
        workshopsUpdatedBy: true,
        workshopsApprovedBy: true,
        workshopsOwner: true,
        participantsCreated: true,
        participantsUpdated: true,
        participantsApprovedBy: true,
        participantsOwner: true,
        messagesCreated: true,
        messagesUpdated: true,
        permissionsCreated: true,
        permissionsUpdated: true,
        userRolesCreated: true,
        userRolesUpdated: true,
        participantRolesCreated: true,
        participantRolesUpdated: true,

        eventParticipantsApprovedBy: true,
        eventParticipantsOwner: true,
        eventParticipantsCreated: true,
        eventParticipantsUpdated: true,
        EventParticipantRolesCreated: true,
        EventParticipantRolesUpdated: true,
      },
    });

    if (!user) {
      return ResponseHandler.error(res, 'Utilisateur non trouvé', 'NOT_FOUND');
    }

    return ResponseHandler.success(res, userDetailResponseSerializer(user));
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return ResponseHandler.error(res, 'Erreur lors de la récupération de l\'utilisateur');
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return ResponseHandler.error(res, 'Utilisateur non trouvé', 'NOT_FOUND');
    }

    // Préparer les données de mise à jour
    const updateData = {};

    // Vérifier et ajouter chaque champ s'il est fourni
    if ('username' in req.body) updateData.username = req.body.username;
    if ('email' in req.body) updateData.email = req.body.email;
    if ('name' in req.body) updateData.name = req.body.name;
    if ('surname' in req.body) updateData.surname = req.body.surname;
    if ('photo' in req.body) updateData.photo = req.body.photo;
    if ('phone' in req.body) updateData.phone = req.body.phone;
    if ('gender' in req.body) updateData.gender = req.body.gender;
    if ('isAdmin' in req.body) updateData.isAdmin = req.body.isAdmin;
    if ('isStaff' in req.body) updateData.isStaff = req.body.isStaff;
    if ('isOwner' in req.body) updateData.isOwner = req.body.isOwner;
    if ('isActive' in req.body) updateData.isActive = req.body.isActive;

    // Gestion spéciale du mot de passe
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(req.body.password, salt);
    }

    // Gestion spéciale du userRole
    if ('userRoleId' in req.body) {
      if (req.body.userRoleId) {
        updateData.userRole = { connect: { id: req.body.userRoleId } };
      } else {
        updateData.userRole = { disconnect: true };
      }
    }

    // Ajouter les champs de mise à jour
    updateData.updatedBy = req.userId;
    updateData.updatedAt = DateTime.now().toJSDate();
    console.log(updateData)

    // Validation des données d'entrée uniquement sur les champs fournis
    if (Object.keys(updateData).length > 0) {
      const { error } = userCreateSerializer.validate(req.body, { 
        allowUnknown: true,
        stripUnknown: false,
        presence: 'optional' 
      });
      
      if (error) {
        return ResponseHandler.error(res, error.details[0].message, 'BAD_REQUEST');
      }
    }

    // Mise à jour de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        userRole: true,
        categoriesCreated: true,
        categoriesUpdated: true,
        eventsCreated: true,
        eventsUpdated: true,
        eventsApprovedBy: true,
        eventsOwner: true,
        workshopsCreatedBy: true,
        workshopsUpdatedBy: true,
        workshopsApprovedBy: true,
        workshopsOwner: true,
        participantsCreated: true,
        participantsUpdated: true,
        participantsApprovedBy: true,
        participantsOwner: true,
        messagesCreated: true,
        messagesUpdated: true,
        permissionsCreated: true,
        permissionsUpdated: true,
        userRolesCreated: true,
        userRolesUpdated: true,
        participantRolesCreated: true,
        participantRolesUpdated: true,
      },
    });

    return ResponseHandler.success(res, userDetailResponseSerializer(updatedUser));
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    return ResponseHandler.error(res, 'Erreur lors de la mise à jour de l\'utilisateur');
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: {
        id,
        isActive: true
      },
    });

    if (!user) {
      return ResponseHandler.error(res, 'Utilisateur non trouvé', 'NOT_FOUND');
    }

    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.noContent(res);
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    return ResponseHandler.error(res, 'Erreur lors de la suppression de l\'utilisateur');
  }
};

exports.restoreUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: {
        id,
        isActive: false
      },
    });

    if (!user) {
      return ResponseHandler.error(res, 'Utilisateur non trouvé', 'NOT_FOUND');
    }

    await prisma.user.update({
      where: { id },
      data: {
        isActive: true,
        updatedBy: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    return ResponseHandler.success(res, null, 'OK');
  } catch (error) {
    console.error('Erreur lors de la restauration de l\'utilisateur:', error);
    return ResponseHandler.error(res, 'Erreur lors de la restauration de l\'utilisateur');
  }
};

// Fonctions utilitaires
function buildWhereCondition(query) {
  const {
    search = '',
    isActive,
    isStaff,
    isAdmin,
    isOwner,
    gender,
    createdBy,
    updatedBy,
    createdAt,
    updatedAt,
    createdAtStart,
    createdAtEnd,
    updatedAtStart,
    updatedAtEnd
  } = query;

  const whereCondition = {
    OR: [
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { surname: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ],
    AND: []
  };

  // Ajout des filtres booléens et autres
  if (isActive !== undefined) whereCondition.isActive = isActive === 'true';
  if (isStaff !== undefined) whereCondition.isStaff = isStaff === 'true';
  if (isAdmin !== undefined) whereCondition.isAdmin = isAdmin === 'true';
  if (isOwner !== undefined) whereCondition.isOwner = isOwner === 'true';
  if (gender) whereCondition.gender = gender;
  if (createdBy) whereCondition.createdBy = createdBy;
  if (updatedBy) whereCondition.updatedBy = updatedBy;

  // Gestion des dates
  addDateConditions(whereCondition, {
    createdAt,
    updatedAt,
    createdAtStart,
    createdAtEnd,
    updatedAtStart,
    updatedAtEnd
  });

  if (whereCondition.AND.length === 0) {
    delete whereCondition.AND;
  }

  return whereCondition;
}

function addDateConditions(whereCondition, dates) {
  const {
    createdAt,
    updatedAt,
    createdAtStart,
    createdAtEnd,
    updatedAtStart,
    updatedAtEnd
  } = dates;

  if (createdAt) {
    const startOfDay = new Date(createdAt);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    whereCondition.AND.push({
      createdAt: {
        gte: startOfDay,
        lt: endOfDay
      }
    });
  } else if (createdAtStart || createdAtEnd) {
    whereCondition.AND.push({
      createdAt: {
        ...(createdAtStart && { gte: new Date(createdAtStart) }),
        ...(createdAtEnd && { lte: new Date(createdAtEnd) })
      }
    });
  }

  if (updatedAt) {
    const startOfDay = new Date(updatedAt);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    whereCondition.AND.push({
      updatedAt: {
        gte: startOfDay,
        lt: endOfDay
      }
    });
  } else if (updatedAtStart || updatedAtEnd) {
    whereCondition.AND.push({
      updatedAt: {
        ...(updatedAtStart && { gte: new Date(updatedAtStart) }),
        ...(updatedAtEnd && { lte: new Date(updatedAtEnd) })
      }
    });
  }
}

function buildPaginationData(total, page, limit) {
  if (limit === -1) {
    return {
      total,
      page: null,
      limit: null,
      totalPages: null,
      hasNextPage: false,
      hasPreviousPage: false
    };
  }

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPreviousPage: page > 1
  };
}

function buildFiltersData(query, sortBy, order) {
  const {
    search,
    createdAt,
    createdAtStart,
    createdAtEnd,
    updatedAt,
    updatedAtStart,
    updatedAtEnd,
    gender,
    isStaff,
    isAdmin,
    isOwner,
    isActive,
    createdBy,
    updatedBy
  } = query;

  return {
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
      gender,
      isStaff,
      isAdmin,
      isOwner,
      isActive,
      createdBy,
      updatedBy
    }
  };
}

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    // const user = await prisma.user.findUnique({ where: { email } });
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: email }, // Cherche par username
          { email: email },    // Cherche par email
          { phone: email },    // Cherche par phone
        ],
      },
    });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    if (!user.email) return res.status(404).json({ message: "Utilisateur trouvé n'a pas d'email" });

    // Générer un token unique
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Stocker le token et l'expiration dans la base
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpire: resetTokenExpire
      }
    });

    // Générer le lien de réinitialisation
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Envoyer l'email
    await sendEmail(
      user.email,
      "Réinitialisation du mot de passe",
      "Demande de réinitialisation",
      `<p>Bonjour,</p>
      <p>Pour réinitialiser votre mot de passe, cliquez sur le lien ci-dessous (valable 15 minutes) :</p>
      <a href="${resetUrl}">${resetUrl}</a>`,
      "L'équipe SUAS"
    );

    res.status(200).json({ message: "Email de réinitialisation envoyé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    // Recherche de l'utilisateur avec le token et une expiration valide
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpire: {
          gte: new Date()
        }
      }
    });
    if (!user) {
      return res.status(400).json({ message: "Lien de réinitialisation invalide ou expiré." });
    }

    // Hashage du nouveau mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Mise à jour du mot de passe et suppression du token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpire: null
      }
    });

    res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = exports;