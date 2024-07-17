const masterOfCeremonyResponseSerializer = (masterOfCeremony) => ({
    id: masterOfCeremony.id,
    referenceNumber: masterOfCeremony.referenceNumber,
    name: masterOfCeremony.name,
    description: masterOfCeremony.description,

    ownerId: masterOfCeremony.ownerId,
    eventId: masterOfCeremony.eventId,

    isActive: masterOfCeremony.isActive,
    createdAt: masterOfCeremony.createdAt,
    updatedAt: masterOfCeremony.updatedAt,
    createdById: masterOfCeremony.createdById,
    updatedById: masterOfCeremony.updatedById,
  });
  
  module.exports = masterOfCeremonyResponseSerializer;