const generateUniqueSlug = async (model, baseSlug, id = null) => {
  let slug = baseSlug;
  let counter = 1;

  const slugExists = async (slug) => {
    const whereCondition = { slug };
    if (id) {
      whereCondition.id = { [model.sequelize.Op.ne]: id };
    }
    const existing = await model.findOne({ where: whereCondition });
    return !!existing;
  };

  while (await slugExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

module.exports = { generateUniqueSlug };
