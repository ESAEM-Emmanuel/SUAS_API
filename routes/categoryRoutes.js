const express = require('express');
const categoryController = require('../controllers/categoryController');
const verifyToken = require('../middleware/verifyJWT'); // Ajout du middleware verifyToken
const router = express.Router();

// Route non protégée

// Middleware pour protéger les autres routes
router.use(verifyToken);

// Routes protégées
router.post('/create', categoryController.createCategory);
router.get('/inactifs', categoryController.getCategoriesInactifs);
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);
router.patch('/:id', categoryController.restoreCategory);

module.exports = router;