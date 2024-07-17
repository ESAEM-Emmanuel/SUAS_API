const userRoleDetailResponseSerializer = (userRole) => ({
    id: userRole.id,
    referenceNumber: userRole.referenceNumber,
    name: userRole.name,
    permissionList: userRole.permissionList,
    createdAt: userRole.createdAt,
    updatedAt: userRole.updatedAt,
    createdBy: userRole.createdBy,
    updatedBy: userRole.updatedBy,
    isActive: userRole.isActive,
    
    created: userRole.created,
    updated: userRole.updated,
    users: userRole.users,
  });
  
  module.exports = userRoleDetailResponseSerializer;