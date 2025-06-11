const participantResponseSerializer = (participant) => ({
    id: participant.id,
    referenceNumber: participant.referenceNumber,
    workshopId: participant.workshopId,
    name: participant.name,
    firstName: participant.firstName,
    companyName: participant.companyName,
    businessSector: participant.businessSector,
    functionC: participant.functionC,
    positionInCompany: participant.positionInCompany,
    photo: participant.photo,
    description: participant.description,
    participantRoleId: participant.participantRoleId,
    isOnlineParticipation: participant.isOnlineParticipation,
    ownerId: participant.ownerId,
    isActive: participant.isActive,
    approvedAt: participant.approvedAt,
    createdAt: participant.createdAt,
    updatedAt: participant.updatedAt,
    isApproved: participant.isApproved,
    createdById: participant.createdById,
    updatedById: participant.updatedById,
    approvedById: participant.approvedById,
    isActiveMicrophone: participant.isActiveMicrophone,
    isHandRaised: participant.isHandRaised, 

    created: participant.created,
    updated: participant.updated,
    participantRole: participant.participantRole,
    participants: participant.participants
  });
  
  module.exports = participantResponseSerializer;