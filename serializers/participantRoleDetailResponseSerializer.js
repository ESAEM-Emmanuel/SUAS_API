const participantRoleDetailResponseSerializer = (participantRole) => ({
    id: participantRole.id,
    referenceNumber: participantRole.referenceNumber,
    name: participantRole.name,
    permissionList: participantRole.permissionList,
    createdAt: participantRole.createdAt,
    updatedAt: participantRole.updatedAt,
    createdBy: participantRole.createdBy,
    updatedBy: participantRole.updatedBy,
    isActive: participantRole.isActive,
    created: participantRole.created,
    updated: participantRole.updated,
    participants: participantRole.participants,
  });
  
  module.exports = participantRoleDetailResponseSerializer;