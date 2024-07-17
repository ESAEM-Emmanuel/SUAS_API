const express = require('express');
const masterOfCeremonytController = require('../controllers/masterOfCeremonytController');
const verifyToken = require('../middleware/verifyJWT'); // Ajout du middleware verifyToken
const router = express.Router();

// Route non protégée

// Middleware pour protéger les autres routes
router.use(verifyToken);

// Routes protégées
router.post('/create', masterOfCeremonytController.createMasterOfCeremony);
router.get('/inactifs', masterOfCeremonytController.getMasterOfCeremonysInactifs);
router.get('/', masterOfCeremonytController.getMasterOfCeremonys);
router.get('/:id', masterOfCeremonytController.getMasterOfCeremony);
router.put('/:id', masterOfCeremonytController.updateMasterOfCeremony);
router.delete('/:id', masterOfCeremonytController.deleteMasterOfCeremony);
router.patch('/:id', masterOfCeremonytController.restoremasterOfCeremony);

module.exports = router;