const eventParticipantRoleDetailResponseSerializer = (eventParticipantRole) => ({
    id: eventParticipantRole.id,
    referenceNumber: eventParticipantRole.referenceNumber,
    name: eventParticipantRole.name,
    permissionList: eventParticipantRole.permissionList,
    createdAt: eventParticipantRole.createdAt,
    updatedAt: eventParticipantRole.updatedAt,
    createdBy: eventParticipantRole.createdBy,
    updatedBy: eventParticipantRole.updatedBy,
    isActive: eventParticipantRole.isActive,
    created: eventParticipantRole.created,
    updated: eventParticipantRole.updated,
    participants: eventParticipantRole.participants,
  });

  module.exports = eventParticipantRoleDetailResponseSerializer;