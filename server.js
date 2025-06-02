const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();  // Ajout de la configuration dotenv

const app = express();
const userRoutes = require('./routes/userRoutes');
// Import other routes...

// Configuration CORS avec variables d'environnement
const corsOptions = {
    // Origines autorisées (domaines qui peuvent accéder à l'API)
    origin: process.env.CORS_ORIGINS ? 
        process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) : 
        ['http://localhost:3000', 'http://localhost:5173'],

    // Méthodes HTTP autorisées
    methods: process.env.CORS_METHODS ? 
        process.env.CORS_METHODS.split(',').map(method => method.trim()) : 
        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

    // En-têtes autorisés
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS ? 
        process.env.CORS_ALLOWED_HEADERS.split(',').map(header => header.trim()) : 
        ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],

    // Autoriser l'envoi de cookies et d'en-têtes d'authentification
    credentials: process.env.CORS_CREDENTIALS === 'false' ? false : true,

    // Durée de mise en cache préflight en secondes
    maxAge: parseInt(process.env.CORS_MAX_AGE) || 86400,

    // Configuration supplémentaire
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Middleware de sécurité
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.REQUEST_BODY_LIMIT || '10mb' }));

// Configuration du rate limiting
const limiter = rateLimit({
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
    max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
    message: {
        status: 'error',
        message: process.env.RATE_LIMIT_MESSAGE || 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Appliquer le rate limiter à toutes les routes
app.use(limiter);

// Routes
app.use('/api/users', userRoutes);
// Use other routes...

// Middleware de gestion des erreurs 404
app.use((req, res, next) => {
    res.status(404).json({
        status: 'error',
        message: 'Route non trouvée'
    });
});

// Middleware de gestion globale des erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Erreur interne du serveur'
    });
});

const PORT = process.env.PORT || 3000;
const ADDRESS = process.env.ADDRESS || 'localhost';
app.listen(PORT, ADDRESS, () => {
    console.log(`Server is running on http://${ADDRESS}:${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    
    // Afficher la configuration CORS actuelle
    if (process.env.NODE_ENV !== 'production') {
        console.log('CORS Configuration:', {
            origins: corsOptions.origin,
            methods: corsOptions.methods,
            allowedHeaders: corsOptions.allowedHeaders,
            credentials: corsOptions.credentials,
            maxAge: corsOptions.maxAge
        });
    }
});