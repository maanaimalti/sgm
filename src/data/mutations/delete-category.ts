
export const deleteCategoryMutation = async (id: string) => {
  const test = new Promise((resolve) => {
    setTimeout(() => {
      resolve(id);
    }, 2000);
  });
  await test;
  // await api.delete(`/category/${id}`);
}