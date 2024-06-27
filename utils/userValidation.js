const Joi = require('joi');

const userSchema = Joi.object({
  userName: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().optional(),
  photo: Joi.string().optional(),
  phone: Joi.string().optional(),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').required(),
  userRole: Joi.string().required(),
  isAdmin: Joi.boolean().required(),
  isStaff: Joi.boolean().required(),
  isOwner: Joi.boolean().required(),
  isActive: Joi.boolean().required()
});

module.exports = {
  userSchema
};