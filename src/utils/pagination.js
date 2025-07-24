
const createPaginationObject = (totalItems, page, limit) => {
  const currentPage = parseInt(page, 10) || 1;
  const itemsPerPage = parseInt(limit, 10) || 10;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return {
    currentPage: currentPage,
    totalPages: totalPages > 0 ? totalPages : 1, // Ensure totalPages is at least 1
    totalItems: totalItems,
    itemsPerPage: itemsPerPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};

module.exports = {
  createPaginationObject,
};