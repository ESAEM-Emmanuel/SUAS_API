const participantResponseSerializer = (participantRole) => ({
    id: participantRole.id,
    referenceNumber: participantRole.referenceNumber,
    name: participantRole.name,
    permissionList: participantRole.permissionList,
    createdAt: participantRole.createdAt,
    updatedAt: participantRole.updatedAt,
    createdBy: participantRole.createdBy,
    updatedBy: participantRole.updatedBy,
  });
  
  module.exports = participantResponseSerializer;