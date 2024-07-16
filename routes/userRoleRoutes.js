const express = require('express');
const userRoleController = require('../controllers/userRoleController');
const verifyToken = require('../middleware/verifyJWT'); // Ajout du middleware verifyToken
const router = express.Router();

// Route non protégée

// Middleware pour protéger les autres routes
router.use(verifyToken);

// Routes protégées
router.post('/create', userRoleController.createUserRole);
router.get('/inactifs', userRoleController.getuserRolesInactifs);
router.get('/', userRoleController.getUserRoles);
router.get('/:id', userRoleController.getUserRole);
router.put('/:id', userRoleController.updateUserRole);
router.delete('/:id', userRoleController.deleteUserRole);
router.patch('/:id', userRoleController.restoreUserRole);

module.exports = router;