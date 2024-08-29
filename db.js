const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

module.exports = pool;

// require('dotenv').config();

// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const authRoutes = require("./routes/authRoutes");
// const categoryRoutes = require("./routes/categoryRoutes");
// const eventRoutes = require("./routes/eventRoutes");
// const fileRoutes = require("./routes/fileRoutes");
// const participantRoleRoutes = require("./routes/participantRoleRoutes");
// const participantRoutes = require("./routes/participantRoutes");
// 
// const userRoutes = require("./routes/userRoutes");
// const userRoleRoutes = require("./routes/userRoleRoutes");
// const workshopRoutes = require("./routes/workshopRoutes");

// const app = express();
// const path = require('path');
// app.use(express.json());

// const corsOptions = {
//     origin: "*"
// }
// app.use(cors(corsOptions));

// app.use(bodyParser.json());
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app.get("/", (req, res) => {
//     res.send("SUAS API");
// });

// app.use("/api", authRoutes);
// app.use("/users", userRoutes);
// app.use("/categories", categoryRoutes);
// app.use("/events", eventRoutes);
// app.use("/file", fileRoutes);
// app.use("/participant", participantRoutes);
// 
// app.use("/participantroles", participantRoleRoutes);
// app.use("/userRoles", userRoleRoutes);
// app.use("/workshops", workshopRoutes);

// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).send('Something went wrong!');
// });

// const PORT = process.env.PORT || 3000;
// const ADDRESS = process.env.ADDRESS || 'localhost';

// app.listen(PORT, ADDRESS, () => {
//     console.log(`Server listening on http://${ADDRESS}:${PORT}`);
// });

// app.use("/api", authRoutes); // Exemple d'utilisation avec authRoutes et authMiddleware
// app.use("/api/users", userRoutes); // Si vous ne voulez pas utiliser verifyToken pour /users
// app.use("/api", authMiddleware, authRoutes); // Exemple d'utilisation avec authRoutes et authMiddleware
// app.use("/users", verifyToken, userRoutes); // Exemple d'utilisation avec verifyToken et userRoutes
// app.use("/categories", verifyAuthorization, categoryRoutes); // Exemple d'utilisation avec verifyAuthorization et categoryRoutes
