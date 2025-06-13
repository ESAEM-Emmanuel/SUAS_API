const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const https = require('https');
const path = require("path");
const fs = require("fs");
// const http = require('http');
const { Server } = require('socket.io');
const { sendEmail } = require('./services/emailService');

const app = express();

// Configuration SSL
const sslOptions = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH || path.join(__dirname, "cert", "cert.key")),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH || path.join(__dirname, "cert", "cert.crt")),
  // Options pour le développement local
  ...(process.env.NODE_ENV === 'development' && {
    rejectUnauthorized: false,
    requestCert: false,
    insecure: true,
    secureOptions: require('constants').SSL_OP_NO_TLSv1_2,
    minVersion: 'TLSv1'
  })
};

// Création du serveur HTTPS avec gestion des erreurs
const server = https.createServer(sslOptions, app);

// Gestion des erreurs SSL
server.on('error', (e) => {
  if (e.code === 'EPROTO') {
    console.log('SSL/TLS error occurred. This is normal in development with self-signed certificates.');
  } else {
    console.error('Server error:', e);
  }
});

// Configuration CORS détaillée
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: (process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,PATCH,OPTIONS').split(','),
  allowedHeaders: (process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,X-Requested-With').split(','),
  exposedHeaders: (process.env.CORS_EXPOSED_HEADERS || 'Content-Range,X-Content-Range').split(','),
  credentials: process.env.CORS_CREDENTIALS === 'true',
  maxAge: parseInt(process.env.CORS_MAX_AGE || '3600'),
  optionsSuccessStatus: 200
};

// Application des middlewares
app.use(cors(corsOptions));
app.use(bodyParser.json());

// Middleware de logging pour toutes les requêtes
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log la requête entrante
  console.log('\n-----------------------------------');
  console.log(`${new Date().toISOString()}`);
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    // Masquer les mots de passe dans les logs
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '********';
    console.log('Body:', sanitizedBody);
  }

  // Intercepter la fin de la réponse pour logger le temps de réponse
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`Response Status: ${res.statusCode}`);
    console.log(`Response Time: ${duration}ms`);
    console.log('-----------------------------------\n');
  });

  next();
});

// Configuration Socket.IO avec CORS
const io = new Server(server, {
  cors: corsOptions
});

// Middleware pour gérer les erreurs CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', corsOptions.origin);
  res.header('Access-Control-Allow-Methods', corsOptions.methods.join(','));
  res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
  res.header('Access-Control-Expose-Headers', corsOptions.exposedHeaders.join(','));
  if (corsOptions.credentials) {
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Ajout d'un middleware pour gérer les erreurs SSL côté client
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Strict-Transport-Security', 'max-age=0');
  }
  next();
});

// Routes existantes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app.get("/", async (req, res) => {
//   try {
//     // Test d'envoi d'email
//     const to = process.env.TEST_EMAIL || 'test@example.com';
//     const subject = 'Objet du mail !';
//     const titre = 'Titre du mail !';
//     const message = 'Message du mail !';
//     const signature = process.env.SIGNATURE|| "L'équipe SUAS";
//     await sendEmail(to, subject, titre, message, signature);
    
//     res.json({
//       status: "success",
//       message: "Events API running and welcome email sent successfully",
//       to: to
//     });
//   } catch (error) {
//     console.error('Error sending welcome email:', error);
//     res.status(500).json({
//       status: "error",
//       message: "Error sending welcome email",
//       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//     });
//   }
// });

app.get("/", async (req, res) => {
  try {
    const to = process.env.TEST_EMAIL || 'test@example.com';
    const subject = 'Test avec pièce jointe';
    const titre = 'Test d\'envoi d\'email';
    const message = 'Ceci est un test d\'envoi d\'email avec une pièce jointe.';
    const signature = process.env.SIGNATURE || "L'équipe SUAS";
    
    // Chemin du fichier spécifique
    const filePath = path.join(__dirname, 'uploads', 'aboressance site_2025-06-05T08-15-54.609Z.png');
    
    // Vérification de l'existence du fichier
    if (!fs.existsSync(filePath)) {
      throw new Error(`Le fichier n'existe pas: ${filePath}`);
    }

    const attachments = [
      {
        filename: 'aboressance site_2025-06-05T08-15-54.609Z.png',
        path: filePath
      }
    ];

    const result = await sendEmail(to, subject, titre, message, signature, attachments);
    
    res.json({
      status: "success",
      message: "Email envoyé avec succès",
      to: to,
      attachments: result.attachments,
      filePath: filePath
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      status: "error",
      message: "Error sending email",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});


// Route de test pour vérifier la configuration
app.get("/test-ssl", (req, res) => {
  res.json({
    status: "success",
    message: "SSL/CORS configuration working",
    environment: process.env.NODE_ENV,
    serverTime: new Date().toISOString(),
    clientIP: req.ip,
    protocol: req.protocol,
    secure: req.secure
  });
});

// Route pour envoyer un email avec une pièce jointe spécifique
app.post("/api/send-email-with-attachment", async (req, res) => {
  try {
    const { to, subject, titre, message, signature, filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        status: "error",
        message: "Le nom du fichier est requis"
      });
    }

    const filePath = path.join(__dirname, 'uploads', filename);
    
    // Vérification de l'existence du fichier
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: "error",
        message: `Le fichier n'existe pas: ${filename}`
      });
    }

    const attachments = [
      {
        filename: filename,
        path: filePath
      }
    ];

    const result = await sendEmail(
      to || process.env.TEST_EMAIL,
      subject || 'Email avec pièce jointe',
      titre || 'Message important',
      message || 'Veuillez trouver ci-joint le fichier demandé.',
      signature || process.env.SIGNATURE || "L'équipe SUAS",
      attachments
    );
    
    res.json({
      status: "success",
      message: "Email envoyé avec succès",
      to: to,
      attachments: result.attachments,
      filePath: filePath
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      status: "error",
      message: "Error sending email",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Import et utilisation des routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const fileRoutes = require('./routes/fileRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const userRoleRoutes = require('./routes/userRoleRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const eventRoutes = require('./routes/eventRoutes');
const workshopRoutes = require('./routes/workshopRoutes');
const participantRoutes = require('./routes/participantRoutes');
const eventParticipantRoutes = require('./routes/eventParticipantRoutes');
// const messageRoutes = require('./routes/messageRoutes')(io);
const participantRoleRoutes = require('./routes/participantRoleRoutes');
const masterOfCeremonyRoutes = require('./routes/masterOfCeremonyRoutes');
const eventParticipantRoleRoutes = require('./routes/eventParticipantRoleRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/roles', userRoleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/eventparticipants', eventParticipantRoutes);
app.use('/api/eventparticipantroles', eventParticipantRoleRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/participants', participantRoutes);
// app.use('/api/messages', messageRoutes);
app.use('/api/masterofceremonies', masterOfCeremonyRoutes);
app.use("/api/usersroles", userRoleRoutes);// route des permissions
app.use("/api/participantsroles", participantRoleRoutes);// route des permissions

// Middleware pour les routes non trouvées
app.use((req, res, next) => {
  res.status(404).json({
    status: "error",
    message: "Route non trouvée"
  });
});

// Middleware pour la gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
const ADDRESS = process.env.ADDRESS || 'localhost';

server.listen(PORT, ADDRESS, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Server listening on https://${ADDRESS}:${PORT}`);
});