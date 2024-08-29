const express = require('express');
const eventController = require('../controllers/eventController');
const verifyToken = require('../middleware/verifyJWT'); // Ajout du middleware verifyToken
const router = express.Router();

// Route non protégée

// Middleware pour protéger les autres routes
router.use(verifyToken);

// Routes protégées
router.post('/create', eventController.createEvent);
router.get('/inactifs', eventController.getEventsInactifs);
router.get('/', eventController.getEvents);
router.get('/owner/:id', eventController.getEventsByOwner);
router.get('/:id', eventController.getEvent);
router.put('/:id', eventController.updateEvent);
router.patch('/approved/:id', eventController.approvedEvent);
router.delete('/:id', eventController.deleteEvent);
router.patch('/:id', eventController.restoreEvent);

module.exports = router;