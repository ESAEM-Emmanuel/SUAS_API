const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const generateUniqueReferenceNumber = require("../utils/utils");
const userCreateSerializer = require('../serializers/userCreateSerializer');
const userResponseSerializer = require('../serializers/userResponseSerializer');
const userDetailResponseSerializer = require('../serializers/userDetailResponseSerializer');

// // Fonction pour créer un nouvel utilisateur
// exports.createUser = async (req, res) => {
//   const {
//     username,
//     email,
//     password,
//     name,
//     surname,
//     photo,
//     phone,
//     gender,
//     userRoleId,
//     isAdmin,
//     isStaff,
//     isOwner,
//     isActive,
//   } = req.body;

//   try {
//     // Validation des données d'entrée
//     const { error } = userCreateSerializer.validate(req.body);
//     if (error) {
//       return res.status(400).json({ error: error.details[0].message });
//     }

//     // Vérification de la valeur du genre
//     if (gender && !['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
//       return res.status(400).json({ error: 'Gender must be: MALE, FEMALE, or OTHER' });
//     }

//     if (!password) {
//       return res.status(400).json({ error: 'Provide the password!' });
//     }

//     // Vérification des contraintes d'unicité
//     const [existingUser, existingEmail, existingPhone, existingPhoto] = await Promise.all([
//       prisma.user.findUnique({ where: { username: username } }),
//       prisma.user.findUnique({ where: { email: email } }),
//       prisma.user.findUnique({ where: { phone: phone } }),
//       prisma.user.findUnique({ where: { photo: photo } })
//     ]);

//     if (existingUser) {
//       return res.status(400).json({ error: 'username already exists' });
//     }

//     if (existingPhone) {
//       return res.status(400).json({ error: 'Phone already exists' });
//     }

//     if (existingEmail) {
//       return res.status(400).json({ error: 'Email already exists' });
//     }
//     if (existingPhoto) {
//       return res.status(400).json({ error: 'Photo already exists' });
//     }


//     // Génération du numéro de référence unique
//     const referenceNumber = await generateUniqueReferenceNumber(prisma.user);

//     // Hashage du mot de passe
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Création de l'utilisateur avec Prisma
//     const newUser = await prisma.user.create({
//       data: {
//         username,
//         referenceNumber,
//         email,
//         password: hashedPassword,
//         name,
//         surname: surname || null,
//         photo: photo || null,
//         phone,
//         gender,
//         userRoleId,
//         isAdmin: isAdmin || false,
//         isStaff: isStaff || false,
//         isOwner: isOwner || false,
//         isActive: isActive || true,
//         createdById: req.userId,
//         createdAt: DateTime.now().toJSDate(),
//       },
//     });

//     // Formatage de la réponse
//     const formattedUser = userResponseSerializer(newUser);

//     // Réponse avec l'utilisateur créé
//     return res.status(201).json(formattedUser);
//   } catch (error) {
//     console.error('Erreur lors de la création de l\'utilisateur :', error);
//     return res.status(500).json({ error: 'Erreur interne du serveur' });
//   }
// };

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
      return res.status(400).json({ error: error.details[0].message });
    }

    // Vérification de la valeur du genre
    if (gender && !['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
      return res.status(400).json({ error: 'Gender must be: MALE, FEMALE, or OTHER' });
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
        if (user.username === username) conflicts.push('Username already exists');
        if (user.email === email) conflicts.push('Email already exists');
        if (user.phone === phone) conflicts.push('Phone already exists');
        if (user.photo === photo) conflicts.push('Photo already exists');
      });

      return res.status(400).json({ error: conflicts.join(', ') });
    }

    // Génération du numéro de référence unique
    const referenceNumber = await generateUniqueReferenceNumber(prisma.user);

    // Hashage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création de l'utilisateur avec Prisma
    const newUser = await prisma.user.create({
      data: {
        username,
        referenceNumber,
        email,
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

    // Formatage de la réponse
    const formattedUser = userResponseSerializer(newUser);

    // Réponse avec l'utilisateur créé
    return res.status(201).json(formattedUser);
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};


exports.login = async (req, res) => {
  const { username, password } = req.body;
  console.log(username , password)
  try {
    // Recherche de l'utilisateur par nom d'utilisateur
    const user = await prisma.user.findUnique({
      where: { username },
    });

    // Vérification de l'utilisateur
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérification du mot de passe
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Création du token JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1y' } // Token valide pendant un an
      // { expiresIn: '1h' }
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
    current_user = userDetailResponseSerializer(current_user);

    // Réponse avec le token JWT
    return res.status(200).json({ token, current_user });
  } catch (error) {
    console.error('Erreur lors de la connexion de l\'utilisateur :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

exports.logout = async (req, res) => {
  const { token } = req.body;
  console.log(token);

  try {
    // Ajout du token à la liste noire
    await prisma.tokenBlacklist.create({
      data: {
        token,
      },
    });

    return res.status(200).json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur lors de la déconnexion :', error);
    return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
};


// Fonction pour récupérer tous les utilisateurs avec pagination
exports.getUsers = async (req, res) => {
  try {
    // Liste des champs de tri valides
    const validSortFields = [
      'id',
      'username',
      'referenceNumber',
      'email',
      'phone',
      'name',
      'photo',
      'gender',
      'isStaff',
      'isAdmin',
      'isOwner',
      'isActive',
      'createdBy',
      'updatedBy',
      'userRoleId',
      'createdAt',
      'updatedAt',
      'surname'
    ];

    // Récupération des paramètres de pagination depuis la requête
    const page = parseInt(req.query.page) || 1;
    const requestedLimit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const requestedSortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order?.toUpperCase() === 'ASC' ? 'asc' : 'desc';

    // Récupération des paramètres de filtrage supplémentaires
    const gender = req.query.gender ? req.query.gender.toUpperCase() : undefined;
    const isStaff = req.query.isStaff !== undefined ? req.query.isStaff === 'true' : undefined;
    const isAdmin = req.query.isAdmin !== undefined ? req.query.isAdmin === 'true' : undefined;
    const isOwner = req.query.isOwner !== undefined ? req.query.isOwner === 'true' : undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const createdBy = req.query.createdBy || undefined;
    const updatedBy = req.query.updatedBy || undefined;

    // Validation du champ de tri
    const sortBy = validSortFields.includes(requestedSortBy) ? requestedSortBy : 'createdAt';

    if (requestedSortBy && !validSortFields.includes(requestedSortBy)) {
      console.warn(`Tentative de tri sur un champ invalide: ${requestedSortBy}. Utilisation de createdAt par défaut.`);
    }

    // Validation du genre
    if (gender && !['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
      return res.status(400).json({
        error: 'La valeur de gender doit être MALE, FEMALE ou OTHER'
      });
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
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { surname: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ],
      AND: []
    };

    // Ajout des filtres booléens et autres
    if (isActive !== undefined) whereCondition.isActive = isActive;
    if (isStaff !== undefined) whereCondition.isStaff = isStaff;
    if (isAdmin !== undefined) whereCondition.isAdmin = isAdmin;
    if (isOwner !== undefined) whereCondition.isOwner = isOwner;
    if (gender) whereCondition.gender = gender;
    if (createdBy) whereCondition.createdBy = createdBy;
    if (updatedBy) whereCondition.updatedBy = updatedBy;

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

    // Récupération du nombre total d'utilisateurs actifs
    const total = await prisma.user.count({ where: whereCondition });

    // Protection contre les performances
    const MAX_USERS_FOR_UNLIMITED_QUERY = 1000;
    if (requestedLimit === -1 && total > MAX_USERS_FOR_UNLIMITED_QUERY) {
      return res.status(400).json({
        error: `La récupération de tous les utilisateurs est limitée à ${MAX_USERS_FOR_UNLIMITED_QUERY} utilisateurs. Veuillez utiliser la pagination.`
      });
    }

    // Configuration de la requête
    let findManyOptions = {
      where: whereCondition,
      orderBy: {
        [sortBy]: order
      },
      include: {
        userRole: true
      }
    };

    // Ajouter la pagination seulement si limit n'est pas -1
    if (requestedLimit !== -1) {
      findManyOptions = {
        ...findManyOptions,
        skip: (page - 1) * requestedLimit,
        take: requestedLimit
      };
    }

    // Récupération des utilisateurs
    const users = await prisma.user.findMany(findManyOptions);

    // Formatage de la réponse
    const formattedUsers = users.map(user => userResponseSerializer(user));

    // Préparation de la réponse
    let paginationData;
    
    if (requestedLimit === -1) {
      // Cas spécial pour limit=-1
      paginationData = {
        total: total,
        page: null,
        limit: null,
        totalPages: null,
        hasNextPage: false,
        hasPreviousPage: false
      };
    } else {
      // Calculs normaux de pagination pour les autres cas
      paginationData = {
        total: total,
        page: page,
        limit: requestedLimit,
        totalPages: Math.ceil(total / requestedLimit),
        hasNextPage: page < Math.ceil(total / requestedLimit),
        hasPreviousPage: page > 1
      };
    }

    return res.status(200).json({
      data: formattedUsers,
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
          gender,
          isStaff,
          isAdmin,
          isOwner,
          isActive,
          createdBy,
          updatedBy
        }
      },
      validSortFields
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer tous les utilisateurs avec pagination
exports.getUsersInactifs = async (req, res) => {
  const { page = 1, limit = 100 } = req.query;

  try {
    const users = await prisma.user.findMany({
      skip: (page - 1) * limit,
      take: parseInt(limit),
      where: {
        isActive: false,
      },
      orderBy: {
        name: 'asc', // Utilisez 'asc' pour un tri croissant ou 'desc' pour un tri décroissant
      },
    });

    const formatedUsers = users.map(userResponseSerializer);
    return res.status(200).json(formatedUsers);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour récupérer un utilisateur par son ID
exports.getUser = async (req, res) => {
  console.log("getUser ok");
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
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

    // Vérification de l'existence de l'utilisateur
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Réponse avec l'utilisateur trouvé
    return res.status(200).json(userDetailResponseSerializer(user));
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour mettre à jour un utilisateur
exports.updateUser = async (req, res) => {
  const { id } = req.params;
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
  console.log("updateUser");

  try {
    // Validation des données d'entrée
    const { error } = userCreateSerializer.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Hachage du mot de passe si présent
    let hashedPassword = undefined;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    // Mise à jour de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        username,
        email,
        ...(password && { password: hashedPassword }), // Inclus le mot de passe seulement s'il est présent
        name,
        surname: surname || null,
        photo: photo || null,
        phone,
        gender,
        // userRoleId: userRoleId || null,
        userRole: userRoleId ? { connect: { id: userRoleId } } : undefined,
        isAdmin: isAdmin !== undefined ? isAdmin : false,
        isStaff: isStaff !== undefined ? isStaff : false,
        isOwner: isOwner !== undefined ? isOwner : false,
        isActive: isActive !== undefined ? isActive : true,
        updatedBy: req.userId,
        updatedAt: DateTime.now().toJSDate(),
      },
    });

    // Récupération de l'utilisateur mis à jour
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
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

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Réponse avec l'utilisateur trouvé
    return res.status(200).json(userDetailResponseSerializer(user));
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour supprimer un utilisateur
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  // Recherche de l'utilisateur par nom d'utilisateur
  const user = await prisma.user.findUnique({
    where: {
      id:id,
      isActive:true
    },
  });

  // Vérification de l'utilisateur
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  try {
    // Mise à jour de l'utilisateur pour une suppression douce
    const deletedUser = await prisma.user.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        isActive: false,
        approvedById: req.userId,
        approvedAt: DateTime.now().toJSDate(),
      },
    });

    if (!deletedUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Réponse de suppression réussie
    return res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Fonction pour restorer un utilisateur
exports.restoreUser = async (req, res) => {
  const { id } = req.params;
  // Recherche de l'utilisateur par nom d'utilisateur
  const user = await prisma.user.findUnique({
    where: {
      id:id,
      isActive:false
    },
  });

  // Vérification de l'utilisateur
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  try {
    // Vérification de l'existence de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: id },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Mise à jour de l'utilisateur pour le restaurer
    await prisma.user.update({
      where: {
        id: id, // Assurez-vous que l'ID est utilisé tel quel (string)
      },
      data: {
        isActive: true,
        approvedById: req.userId,
        approvedAt: DateTime.now().toJSDate(),
      },
    });

    // Réponse de restauration réussie
    return res.status(200).send();
  } catch (error) {
    console.error('Erreur lors de la restauration de l\'utilisateur :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

// Export des fonctions du contrôleur
module.exports = exports;