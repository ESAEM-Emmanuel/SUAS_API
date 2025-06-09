const express = require('express');
const eventParticipantController = require('../controllers/eventParticipantController');
const verifyToken = require('../middleware/verifyJWT'); // Ajout du middleware verifyToken
const router = express.Router();

// Middleware pour protéger les autres routes
router.use(verifyToken);

// Routes protégées
router.post('/create', eventParticipantController.createParticipant);
router.get('/', eventParticipantController.getParticipants);
router.get('/inactifs', eventParticipantController.getParticipantsInactifs);
router.get('/:id', eventParticipantController.getParticipant);
router.put('/:id', eventParticipantController.updateParticipant);
router.patch('/approved/:id', eventParticipantController.approvedParticipant);
router.delete('/:id', eventParticipantController.deleteParticipant);
router.patch('/:id', eventParticipantController.restoreParticipant);

module.exports = router;