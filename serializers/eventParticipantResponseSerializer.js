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
  });
  
  module.exports = eventParticipantResponseSerializer;