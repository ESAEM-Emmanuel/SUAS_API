const express = require('express');
const participantController = require('../controllers/participantController');
const verifyToken = require('../middleware/verifyJWT'); // Ajout du middleware verifyToken
const router = express.Router();

// Middleware pour protéger les autres routes
router.use(verifyToken);

// Routes protégées
router.post('/create', participantController.createParticipant);
router.get('/', participantController.getParticipants);
router.get('/inactifs', participantController.getParticipantsInactifs);
router.get('/:id', participantController.getParticipant);
router.put('/:id', participantController.updateParticipant);
router.patch('/changemicstate/:id', participantController.changeMicState);
router.patch('/changehandstate/:id', participantController.changeHandState);
router.patch('/approved/:id', participantController.approvedParticipant);
router.delete('/:id', participantController.deleteParticipant);
router.patch('/:id', participantController.restoreParticipant);

module.exports = router;