const workshopResponseSerializer = (workshop) => ({
    id: workshop.id,
    referenceNumber: workshop.referenceNumber,
    eventId: workshop.eventId,
    name: workshop.name,
    ownerId: workshop.ownerId,
    description: workshop.description,
    room: workshop.room,
    status: workshop.status,
    accessKey: workshop.accessKey,
    photo: workshop.photo,
    program: workshop.program,
    numberOfPlaces: workshop.numberOfPlaces,
    price: workshop.price,
    isOnlineWorkshop: workshop.isOnlineWorkshop,
    startDate: workshop.startDate,
    endDate: workshop.endDate,
    isActive: workshop.isActive,
    createdAt: workshop.createdAt,
    updatedAt: workshop.updatedAt,
    isApproved: workshop.isApproved,
    isPublic: workshop.isPublic,
    approvedAt: workshop.approvedAt,
    createdById: workshop.createdById,
    updatedById: workshop.updatedById,
    approvedById: workshop.approvedById,

    owner: workshop.owner,
    created: workshop.created,
    approved: workshop.approved,
  });
  
  module.exports = workshopResponseSerializer;