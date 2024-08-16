const participantDetailResponseSerializer = (participant) => ({
    id: participant.id,
    referenceNumber: participant.referenceNumber,
    workshopId: participant.workshopId,
    name: participant.name,
    photo: participant.photo,
    description: participant.description,
    participantRoleId: participant.participantRoleId,
    isOnlineParticipation: participant.isOnlineParticipation,
    ownerId: participant.ownerId,
    approvedAt: participant.approvedAt,
    createdAt: participant.createdAt,
    updatedAt: participant.updatedAt,
    isApproved: participant.isApproved,
    createdById: participant.createdById,
    updatedById: participant.updatedById,
    approvedById: participant.approvedById,
    isActive: participant.isActive,
    
    participantRole: participant.participantRole,
    created: participant.created,
    updated: participant.updated,
    approved: participant.approved,
    owner: participant.owner,
    workshop: participant.workshop,
    messages: participant.messages,
  });
  
  module.exports = participantDetailResponseSerializer;