const express = require('express');
const workshopController = require('../controllers/workshopController');
const verifyToken = require('../middleware/verifyJWT'); // Ajout du middleware verifyToken
const router = express.Router();

// Route non protégée

// Middleware pour protéger les autres routes
router.use(verifyToken);

// Routes protégées
router.post('/create', workshopController.createWorkshop);
router.get('/inactifs', workshopController.getWorkshopsInactifs);
router.get('/', workshopController.getWorkshops);
router.get('/:id', workshopController.getWorkshop);
router.put('/:id', workshopController.updateWorkshop);
router.patch('/approved/:id', workshopController.approvedWorkshop);
router.delete('/:id', workshopController.deleteWorkshop);
router.patch('/:id', workshopController.restoreWorkshop);

module.exports = router;