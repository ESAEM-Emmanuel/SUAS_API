const express = require('express');
const participantRoleController = require('../controllers/participantRoleController');
const verifyToken = require('../middleware/verifyJWT'); // Ajout du middleware verifyToken
const router = express.Router();

// Route non protégée

// Middleware pour protéger les autres routes
router.use(verifyToken);

// Routes protégées
router.post('/create', participantRoleController.createParticipantRole);
router.get('/inactifs', participantRoleController.getParticipantRolesInactifs);
router.get('/', participantRoleController.getParticipantRoles);
router.get('/:id', participantRoleController.getParticipantRole);
router.put('/:id', participantRoleController.updateParticipantRole);
router.delete('/:id', participantRoleController.deleteParticipantRole);
router.patch('/:id', participantRoleController.restoreParticipantRole);

module.exports = router;