const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { DateTime } = require('luxon');

// Fonction pour générer un numéro de référence unique
async function generateUniqueReferenceNumber(model) {
  try {
    // REFERENCE_NUMBER peut être défini dynamiquement ou statiquement en fonction de vos besoins
    const REFERENCE_NUMBER = 10001;

    // Obtenez le mois/année actuel au format MM/YYYY
    const codefin = DateTime.now().toFormat('MM/yyyy');

    // Comptez le nombre d'objets avec une referenceNumber se terminant par le codefin actuel
    const count = await prisma.user.count({
      where: {
        referenceNumber: {
          endsWith: codefin
        }
      }
    });

    // Calculez le nouvel ID en ajoutant le nombre d'objets actuels à REFERENCE_NUMBER
    const newId = REFERENCE_NUMBER + count;

    // Concaténez le nouvel ID avec le codefin pour former la nouvelle referenceNumber
    const concatenatedReferenceNumber = `${newId}/${codefin}`;

    return concatenatedReferenceNumber;
  } catch (error) {
    console.error('Erreur lors de la génération du numéro de référence :', error);
    throw new Error('Erreur interne du serveur');
  }
}

module.exports = generateUniqueReferenceNumber;