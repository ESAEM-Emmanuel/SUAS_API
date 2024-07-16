const participantResponseSerializer = (participant) => ({
    id: participant.id,
    participantname: participant.participantname,
    referenceNumber: participant.referenceNumber,
    email: participant.email,
    phone: participant.phone,
    name: participant.name,
    photo: participant.photo,
    gender: participant.gender,
    participantRoleId: participant.participantRoleId,
    isStaff: participant.isStaff,
    isAdmin: participant.isAdmin,
    isOwner: participant.isOwner,
    isActive: participant.isActive,
    createdBy: participant.createdBy,
    updatedBy: participant.updatedBy
  });
  
  module.exports = participantResponseSerializer;