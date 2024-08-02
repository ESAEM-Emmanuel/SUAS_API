const workshopResponseSerializer = (workshop) => ({
    id: workshop.id,
    referenceNumber: workshop.referenceNumber,
    eventId: workshop.eventId,
    name: workshop.name,
    description: workshop.description,
    room: workshop.room,
    accessKey: workshop.accessKey,
    photo: workshop.photo,
    numberOfPlaces: workshop.numberOfPlaces,
    price: workshop.price,
    isOnlineWorkshop: workshop.isOnlineWorkshop,
    startDate: workshop.startDate,
    endDate: workshop.endDate,
    isActive: workshop.isActive,
    ownerId: workshop.ownerId,
    createdAt: workshop.createdAt,
    updatedAt: workshop.updatedAt,
    isApproved: workshop.isApproved,
    isPublic: workshop.isPublic,
    approvedAt: workshop.approvedAt,
    createdById: workshop.createdById,
    updatedById: workshop.updatedById,
    approvedById: workshop.approvedById
  });
  
  module.exports = workshopResponseSerializer;