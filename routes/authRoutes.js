const express = require("express"); // importons le module Express
const authRouter = express.Router(); //créons un objet Router à l'aide de la méthode Router() d'express
const authController = require("../controllers/authController");// importons le module authController

authRouter.post('/login', authController.login); //une requête POST effectuée sur /login, Express appelle la méthode login du authController

module.exports = authRouter; // rend accessible à d'autres parties de l'application qui peuvent l'importer
