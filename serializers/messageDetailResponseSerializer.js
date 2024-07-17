const messageDetailResponseSerializer = (message) => ({
    id: message.id,
    referenceNumber: message.referenceNumber,
    workshopId: message.workshopId,
    content: message.content,
    messageType: message.messageType,
    participantId: message.participantId,
    isActive: message.isActive,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    isApproved: message.isApproved,
    createdById: message.createdById,
    updatedById: message.updatedById,
    created: message.created,
    updated: message.updated,
    workshop: message.workshop,
    workshop: message.workshop,
  });
  
  module.exports = messageDetailResponseSerializer;