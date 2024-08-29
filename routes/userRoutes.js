const express = require('express');
const userController = require('../controllers/userController');
const verifyToken = require('../middleware/verifyJWT'); // Ajout du middleware verifyToken
const router = express.Router();

// Route non protégée
router.post('/register', userController.createUser);
router.post('/login', userController.login);

// Middleware pour protéger les autres routes
router.use(verifyToken);

// Routes protégées
router.get('/', userController.getUsers);
router.get('/inactifs', userController.getUsersInactifs);
router.get('/:id', userController.getUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.patch('/:id', userController.restoreUser);
router.post('/logout', userController.logout);
module.exports = router;