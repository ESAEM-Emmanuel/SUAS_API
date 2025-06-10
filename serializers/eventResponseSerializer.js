const eventResponseSerializer = (event) => ({
    id: event.id,
    referenceNumber: event.referenceNumber,
    categoryId: event.categoryId,
    name: event.name,
    description: event.description,
    photo: event.photo,
    program: event.program,
    startDate: event.startDate,
    endDate: event.endDate,
    ownerId: event.ownerId,
    isApproved: event.isApproved,
    isPublic: event.isPublic,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    approvedAt: event.approvedAt,
    createdBy: event.createdBy,
    updatedBy: event.updatedBy,
    approvedById: event.approvedById,

    owner: event.owner,
    category: event.category,
    masterOfCeremonies: event.masterOfCeremonies,
    workshops: event.workshops,
    eventParticipants: event.eventParticipants
  });
  
  module.exports = eventResponseSerializer;