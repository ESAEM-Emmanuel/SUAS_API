const permissionDetailResponseSerializer = (permission) => ({
    id: permission.id,
    referenceNumber: permission.referenceNumber,
    name: permission.name,
    createdAt: permission.createdAt,
    updatedAt: permission.updatedAt,
    createdBy: permission.createdBy,
    updatedBy: permission.updatedBy,
  });
  
  module.exports = permissionDetailResponseSerializer;