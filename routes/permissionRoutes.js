const express = require('express');
const permissionController = require('../controllers/permissionController');
const verifyToken = require('../middleware/verifyJWT'); // Ajout du middleware verifyToken
const router = express.Router();

// Route non protégée

// Middleware pour protéger les autres routes
router.use(verifyToken);

// Routes protégées
router.post('/create', permissionController.createPermission);
router.get('/inactifs', permissionController.getPermissions);
router.get('/', permissionController.getPermissions);
router.get('/:id', permissionController.getPermission);
router.put('/:id', permissionController.updatePermission);
router.delete('/:id', permissionController.deletePermission);
router.patch('/:id', permissionController.restorePermission);

module.exports = router;