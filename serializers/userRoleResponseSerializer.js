const userRoleResponseSerializer = (userRole) => ({
    id: userRole.id,
    referenceNumber: userRole.referenceNumber,
    name: userRole.name,
    permissionList: userRole.permissionList,
    createdAt: userRole.createdAt,
    updatedAt: userRole.updatedAt,
    createdBy: userRole.created ? {
      id: userRole.created.id,
      name: userRole.created.name,
    } : null,
    updatedBy: userRole.updated ? {
      id: userRole.updated.id,
      name: userRole.updated.name,
    } : null,
    isActive: userRole.isActive,
  });
  
  module.exports = userRoleResponseSerializer;