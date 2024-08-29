const { verify } = require("jsonwebtoken");

const verifyAuthorization = async (req, res, next) => {
    const { id } = req.user;
    const user = await prisma.user.findOne({
      where: { id },
      include: { employee: true }
    });
    if (!user || !user.employee) {
      return res.status(403).json({ message: 'User not found or not an employee' });
    }
    // Assuming the user can perform CRUD operations only within their department
    req.departmentId = user.employee.id_department;
    next();
  };

module.exports = verifyAuthorization;