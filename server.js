const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');
// Import other routes...

app.use(express.json());
app.use('/users', userRoutes);
// Use other routes...

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});