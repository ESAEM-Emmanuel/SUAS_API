const eventParticipantResponseSerializer = (eventParticipant) => ({
    id: eventParticipant.id,
    referenceNumber: eventParticipant.referenceNumber,
    eventId: eventParticipant.eventId,
    ownerId: eventParticipant.ownerId,
    eventParticipantRoleId: eventParticipant.eventParticipantRoleId,
    createdAt: eventParticipant.createdAt,
    updatedAt: eventParticipant.updatedAt,
    createdBy: eventParticipant.createdBy,
    updatedBy: eventParticipant.updatedBy,
    eventParticipantRole: eventParticipant.eventParticipantRole,
    owner: eventParticipant.owner,
    workshop: eventParticipant.workshop,
  });
  
  module.exports = eventParticipantResponseSerializer;