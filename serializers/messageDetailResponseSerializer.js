const messageDetailResponseSerializer = (message) => ({
    id: message.id,
    referenceNumber: message.referenceNumber,
    workshopId: message.workshopId,
    content: message.content,
    tag: message.tag,
    urlFile: message.urlFile,
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
    participant: message.participant,
  });
  
  module.exports = messageDetailResponseSerializer;