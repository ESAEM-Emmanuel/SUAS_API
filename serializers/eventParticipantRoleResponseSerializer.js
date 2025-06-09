const eventParticipantRoleResponseSerializer = (eventParticipantRole) => ({
    id: eventParticipantRole.id,
    referenceNumber: eventParticipantRole.referenceNumber,
    name: eventParticipantRole.name,
    permissionList: eventParticipantRole.permissionList,
    createdAt: eventParticipantRole.createdAt,
    updatedAt: eventParticipantRole.updatedAt,
    createdBy: eventParticipantRole.createdBy,
    updatedBy: eventParticipantRole.updatedBy,
  });
  
  module.exports = eventParticipantRoleResponseSerializer;