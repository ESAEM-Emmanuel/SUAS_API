// const express = require('express');
// const messageController = require('../controllers/messageController');
// const verifyToken = require('../middleware/verifyJWT'); // Ajout du middleware verifyToken
// const router = express.Router();

// // Middleware pour protéger les autres routes
// router.use(verifyToken);

// // Routes protégées
// router.post('/create', messageController.createMessage);
// router.get('/', messageController.getMessages);
// router.get('/inactifs', messageController.getMessagesInactifs);
// router.get('/:id', messageController.getMessage);
// router.put('/:id', messageController.updateMessage);
// router.delete('/:id', messageController.deleteMessage);
// router.patch('/:id', messageController.restoreMessage);

// module.exports = router;

// const express = require('express');
// const messageController = require('../controllers/messageController');
// const verifyToken = require('../middleware/verifyJWT'); // Ajout du middleware verifyToken

// module.exports = (io) => {
//     const router = express.Router();

//     // Middleware pour protéger les autres routes
//     router.use(verifyToken);

//     // Routes protégées
//     router.post('/create', (req, res) => messageController.createMessage(req, res, io));
//     router.get('/', messageController.getMessages);
//     router.get('/inactifs', messageController.getMessagesInactifs);
//     router.get('/:id', messageController.getMessage);
//     router.put('/:id', (req, res) => messageController.updateMessage(req, res, io));
//     router.delete('/:id', (req, res) => messageController.deleteMessage(req, res, io));
//     router.patch('/:id', (req, res) => messageController.restoreMessage(req, res, io));

//     return router;
// };

const express = require('express');
const verifyToken = require('../middleware/verifyJWT');
const router = express.Router();

module.exports = (io) => {
  const messageController = require('../controllers/messageController')(io);

  router.use(verifyToken);

  router.post('/create', messageController.createMessage);
  router.get('/', messageController.getMessages);
  router.get('/inactifs', messageController.getMessagesInactifs);
  router.get('/:id', messageController.getMessage);
  router.get('/workshop/:id', messageController.getMessageByWorkshop);
  router.put('/:id', messageController.updateMessage);
  router.delete('/:id', messageController.deleteMessage);
  router.patch('/:id', messageController.restoreMessage);

  return router;
};