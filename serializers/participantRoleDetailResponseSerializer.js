const participantRoleDetailResponseSerializer = (participantRole) => ({
    id: participantRole.id,
    referenceNumber: participantRole.referenceNumber,
    name: participantRole.name,
    permissionList: participantRole.permissionList,
    createdAt: participantRole.createdAt,
    updatedAt: participantRole.updatedAt,
    createdBy: participantRole.created ? {
      id: participantRole.created.id,
      name: participantRole.created.name,
    } : null,
    updatedBy: participantRole.updated ? {
      id: participantRole.updated.id,
      name: participantRole.updated.name,
    } : null,
    isActive: participantRole.isActive,
    participants: participantRole.participants,
  });
  
  module.exports = participantRoleDetailResponseSerializer;