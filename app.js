const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authMiddleware = require('./middleware/authMiddleware');
const verifyAuthorization = require('./middleware/verifyAuthorization');
const verifyToken = require('./middleware/verifyJWT');

const app = express();

// Middleware pour gérer les CORS
const corsOptions = {
    origin: '*'
};
app.use(cors(corsOptions));

// Middleware pour parser les données du corps des requêtes
app.use(bodyParser.json());

// Définition des routes
app.get("/", (req, res) => {
    res.send("Welcome");
});

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const fileRoutes = require("./routes/fileRoutes");

app.use("/api", authRoutes); // authRoutes sans middleware
app.use("/api/users", userRoutes); // userRoutes sans middleware pour tous les endpoints
app.use("/api/file", fileRoutes); //

// Middleware pour la gestion des erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
const ADDRESS = process.env.ADDRESS || 'localhost';

app.listen(PORT, ADDRESS, () => {
    console.log(`Server listening on http://${ADDRESS}:${PORT}`);
});