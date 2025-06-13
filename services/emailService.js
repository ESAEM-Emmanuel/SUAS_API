const nodemailer = require('nodemailer');
const path = require('path');

// Configuration du transporteur d'email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Fonction générique pour envoyer un email avec ou sans pièces jointes
 * @param {string} to - Adresse email du destinataire
 * @param {string} subject - Sujet de l'email
 * @param {string} titre - Titre du contenu de l'email
 * @param {string} message - Message principal de l'email
 * @param {string} signature - Signature de l'email
 * @param {Array<{filename: string, path: string}>} attachments - Tableau des pièces jointes (optionnel)
 * @returns {Promise<Object>} - Résultat de l'envoi
 */
const sendEmail = async (to, subject, titre, message, signature, attachments = []) => {
  try {
    // Validation des paramètres obligatoires
    if (!to || !subject || !titre || !message) {
      throw new Error('Les paramètres to, subject, titre et message sont obligatoires');
    }

    // Préparation des pièces jointes
    const formattedAttachments = attachments.map(attachment => ({
      filename: attachment.filename,
      path: attachment.path,
      // Ajout du type MIME automatiquement basé sur l'extension
      contentType: getMimeType(attachment.filename)
    }));

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: to,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">${titre}</h1>
          <div style="margin: 20px 0; line-height: 1.6;">
            ${message}
          </div>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666;">Cordialement,<br>${signature || "L'équipe SUAS"}</p>
          </div>
        </div>
      `,
      attachments: formattedAttachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email envoyé avec succès:', info.messageId);
    return { 
      success: true, 
      messageId: info.messageId,
      attachments: attachments.length > 0 ? attachments.map(a => a.filename) : []
    };
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};

/**
 * Fonction utilitaire pour déterminer le type MIME d'un fichier
 * @param {string} filename - Nom du fichier
 * @returns {string} - Type MIME
 */
const getMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.txt': 'text/plain',
    '.csv': 'text/csv'
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

// Fonction pour envoyer un email de bienvenue (maintenue pour la rétrocompatibilité)
const sendWelcomeEmail = async (to, name) => {
  return sendEmail(
    to,
    'Bienvenue sur notre plateforme !',
    `Bienvenue ${name} !`,
    `
      <p>Nous sommes ravis de vous accueillir sur notre plateforme.</p>
      <p>Vous pouvez dès maintenant commencer à explorer nos services.</p>
    `,
    "L'équipe SUAS"
  );
};

module.exports = {
  sendEmail,
  sendWelcomeEmail
}; 