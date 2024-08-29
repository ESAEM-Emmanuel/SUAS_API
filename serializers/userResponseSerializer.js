const userResponseSerializer = (user) => ({
    id: user.id,
    username: user.username,
    referenceNumber: user.referenceNumber,
    email: user.email,
    phone: user.phone,
    name: user.name,
    surname: user.surname,
    photo: user.photo,
    gender: user.gender,
    userRoleId: user.userRoleId,
    isStaff: user.isStaff,
    isAdmin: user.isAdmin,
    isOwner: user.isOwner,
    isActive: user.isActive,
    createdBy: user.createdBy,
    updatedBy: user.updatedBy
  });
  
  module.exports = userResponseSerializer;