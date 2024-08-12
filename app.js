// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// require('dotenv').config();

// // Ajout socket.io ajout
// const http = require('http');
// const { Server } = require('socket.io');



// const { PrismaClient } = require('@prisma/client');

// // const prisma = new PrismaClient();
// // const verifyToken = require('./middleware/verifyJWT');

// const app = express();

// // Middleware pour gérer les CORS
// const corsOptions = {
//     origin: '*'
// };
// app.use(cors(corsOptions));

// //socket.io ajout
// const server = http.createServer(app);
// const io = new Server(server);

// // Middleware pour parser les données du corps des requêtes
// app.use(bodyParser.json());

// // Définition des routes
// app.get("/", (req, res) => {
//     res.send("Welcome");
// });

// const authRoutes = require("./routes/authRoutes");
// const userRoutes = require("./routes/userRoutes");
// const fileRoutes = require("./routes/fileRoutes");
// const permissionRoutes = require("./routes/permissionRoutes");
// const userRoleRoutes = require("./routes/userRoleRoutes");
// const categoryRoutes = require("./routes/categoryRoutes");
// const eventRoutes = require("./routes/eventRoutes");
// const workshopRoutes = require("./routes/workshopRoutes");
// const participantRoutes = require("./routes/participantRoutes");
// const messageRoutes = require("./routes/messageRoutes");
// const participantRoleRoutes = require("./routes/participantRoleRoutes");
// const masterOfCeremonyRoutes = require("./routes/masterOfCeremonyRoutes");

// // app.use("/api", authRoutes); // authRoutes sans middleware
// // app.use("/api/users", verifyToken, userRoutes); // userRoutes avec middleware
// // app.use("/permissions", verifyToken, permissionRoutes); // route des permissions avec middleware
// // app.use("/api/file", verifyToken, fileRoutes); // fileRoutes avec middleware

// app.use("/api", authRoutes); // authRoutes sans middleware
// app.use("/api/users", userRoutes); // userRoutes sans middleware pour tous les endpoints
// app.use("/api/permissions", permissionRoutes);// route des permissions
// app.use("/api/categories", categoryRoutes);// route des permissions
// app.use("/api/events", eventRoutes);// route des permissions
// app.use("/api/masterofceremonies", masterOfCeremonyRoutes);// route des permissions
// app.use("/api/workshops", workshopRoutes);// route des permissions
// app.use("/api/usersroles", userRoleRoutes);// route des permissions
// app.use("/api/participants", participantRoutes);// route des permissions
// app.use("/api/messages", messageRoutes);// route des permissions
// app.use("/api/participantsroles", participantRoleRoutes);// route des permissions
// app.use("/api/files", fileRoutes); // routes userRoleRoutes

// // Middleware pour la gestion des erreurs
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).send('Something went wrong!');
// });

// // Démarrage du serveur
// const PORT = process.env.PORT || 3000;
// const ADDRESS = process.env.ADDRESS || 'localhost';

// app.listen(PORT, ADDRESS, () => {
//     console.log(`Server listening on http://${ADDRESS}:${PORT}`);
// });

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

app.use(cors());
app.use(bodyParser.json());

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const fileRoutes = require('./routes/fileRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const userRoleRoutes = require('./routes/userRoleRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const eventRoutes = require('./routes/eventRoutes');
const workshopRoutes = require('./routes/workshopRoutes');
const participantRoutes = require('./routes/participantRoutes');
const messageRoutes = require('./routes/messageRoutes')(io);// Ajout des routes des messages
const participantRoleRoutes = require('./routes/participantRoleRoutes');
const masterOfCeremonyRoutes = require('./routes/masterOfCeremonyRoutes');

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/roles', userRoleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/master-of-ceremony', masterOfCeremonyRoutes);
app.use("/api/usersroles", userRoleRoutes);// route des permissions
app.use("/api/participantsroles", participantRoleRoutes);// route des permissions

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected');
    
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });
  
  // Middleware for error handling
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
  });
  
  // Start the server
  const PORT = process.env.PORT || 3000;
  const ADDRESS = process.env.ADDRESS || 'localhost';
  server.listen(PORT, ADDRESS, () => {
    console.log(`Server listening on http://${ADDRESS}:${PORT}`);
  });