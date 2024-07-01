const permissionResponseSerializer = (permission) => ({
    id: permission.id,
    referenceNumber: permission.referenceNumber,
    name: permission.name,
    createdBy: permission.createdBy,
    updatedBy: permission.updatedBy
  });
  
  module.exports = permissionResponseSerializer;