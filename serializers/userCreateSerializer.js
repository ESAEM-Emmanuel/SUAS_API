const Joi = require('joi');

const userCreateSerializer = Joi.object({
  username: Joi.string().optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().optional(),
  phone: Joi.string().required(),
  name: Joi.string().optional(),
  surname: Joi.string().optional(),
  photo: Joi.string().optional().allow(null),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').optional(),
  userRoleId: Joi.string().optional().allow(null),
  isAdmin: Joi.boolean().optional(),
  isStaff: Joi.boolean().optional(),
  isOwner: Joi.boolean().optional(),
  isActive: Joi.boolean().optional()
});

module.exports = userCreateSerializer;