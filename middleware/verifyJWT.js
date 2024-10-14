const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  

  try {
    // Vérifier si le token est blacklisté
    // const blacklistedToken = await prisma.tokenBlacklist.findUnique({
    //   where: { token },
    // });

    // if (blacklistedToken) {
    //   return res.status(401).json({ error: 'Token invalide' });
    // }

    // Vérifier le token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; // Assurez-vous que la propriété correspond à celle du payload du jeton
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = verifyToken;