const express = require('express');
const eventParticipantRoleController = require('../controllers/eventParticipantRoleController');
const verifyToken = require('../middleware/verifyJWT'); // Ajout du middleware verifyToken
const router = express.Router();

// Route non protégée

// Middleware pour protéger les autres routes
router.use(verifyToken);

// Routes protégées
router.post('/create', eventParticipantRoleController.createParticipantRole);
router.get('/inactifs', eventParticipantRoleController.getParticipantRolesInactifs);
router.get('/', eventParticipantRoleController.getParticipantRoles);
router.get('/:id', eventParticipantRoleController.getParticipantRole);
router.put('/:id', eventParticipantRoleController.updateParticipantRole);
router.delete('/:id', eventParticipantRoleController.deleteParticipantRole);
router.patch('/:id', eventParticipantRoleController.restoreParticipantRole);

module.exports = router;