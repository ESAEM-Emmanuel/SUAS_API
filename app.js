const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const https = require('https');
const path = require("path");
const fs = require("fs");
// const http = require('http');
const { Server } = require('socket.io');

const app = express();
const options = {
  key: fs.readFileSync(path.join(__dirname, "cert", "cert.key"), 'utf-8'),
  cert: fs.readFileSync(path.join(__dirname, "cert", "cert.crt"), 'utf-8')
}
const server = https.createServer(options, app);
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
// const messageRoutes = require('./routes/messageRoutes')(io);
const participantRoleRoutes = require('./routes/participantRoleRoutes');
const masterOfCeremonyRoutes = require('./routes/masterOfCeremonyRoutes');

// app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get("/",(req, res) => {
  res.send("Events API running");
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/roles', userRoleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/participants', participantRoutes);
// app.use('/api/messages', messageRoutes);
app.use('/api/masterofceremonies', masterOfCeremonyRoutes);
app.use("/api/usersroles", userRoleRoutes);// route des permissions
app.use("/api/participantsroles", participantRoleRoutes);// route des permissions

// Socket.io connection
// io.on('connection', (socket) => {
//     console.log('A user connected');
    
//     socket.on('disconnect', () => {
//       console.log('User disconnected');
//     });
//   });
  
  // Middleware for error handling
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
  });
  
  // Start the server
  const PORT = process.env.PORT || 3000;
  const ADDRESS = process.env.ADDRESS || 'localhost';
  server.listen(PORT, ADDRESS, () => {
    console.log(`Server listening on https://${ADDRESS}:${PORT}`);
  });