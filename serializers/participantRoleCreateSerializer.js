const Joi = require('joi');

const participantRoleCreateSerializer = Joi.object({
  name: Joi.string().required(), // Le champ 'name' doit être requis car il est unique et nécessaire pour identifier le rôle.
  permissionList: Joi.array().items(Joi.string()).required(), // 'permissions_listing' est un tableau de chaînes de caractères et doit être requis.
});

module.exports = participantRoleCreateSerializer;