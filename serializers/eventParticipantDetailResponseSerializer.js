const eventParticipantDetailResponseSerializer = (eventParticipant) => ({
    id: eventParticipant.id,
    referenceNumber: eventParticipant.referenceNumber,
    eventId: eventParticipant.eventId,
    ownerId: eventParticipant.ownerId,
    eventParticipantRoleId: eventParticipant.eventParticipantRoleId,
    approvedAt: eventParticipant.approvedAt,
    createdAt: eventParticipant.createdAt,
    updatedAt: eventParticipant.updatedAt,
    isApproved: eventParticipant.isApproved,
    createdById: eventParticipant.createdById,
    updatedById: eventParticipant.updatedById,
    approvedById: eventParticipant.approvedById,
    isActive: eventParticipant.isActive,
    eventParticipantRole: eventParticipant.eventParticipantRole,
    created: eventParticipant.created,
    updated: eventParticipant.updated,
    approved: eventParticipant.approved,
    owner: eventParticipant.owner,
    workshop: eventParticipant.workshop,
  });
  
  module.exports = eventParticipantDetailResponseSerializer;