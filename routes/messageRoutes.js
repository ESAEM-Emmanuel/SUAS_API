const express = require('express');
const messageController = require('../controllers/messageController');
const verifyToken = require('../middleware/verifyJWT'); // Ajout du middleware verifyToken
const router = express.Router();

// Middleware pour protéger les autres routes
router.use(verifyToken);

// Routes protégées
router.post('/create', messageController.createMessage);
router.get('/', messageController.getMessages);
router.get('/inactifs', messageController.getMessagesInactifs);
router.get('/:id', messageController.getMessage);
router.put('/:id', messageController.updateMessage);
router.patch('/approved/:id', messageController.approvedMessage);
router.delete('/:id', messageController.deleteMessage);
router.patch('/:id', messageController.restoreMessage);

module.exports = router;