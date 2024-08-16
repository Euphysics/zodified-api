/**
 * getFormDataStream
 * @param data - the data to be encoded as form data stream
 * @returns a readable stream of the form data and optionnaly headers
 */
export const getFormDataStream = (
  data: Record<string, string | Blob>,
): {
  data: FormData;
} => {
  const formData = new FormData();
  for (const key in data) {
    formData.append(key, data[key]);
  }
  return {
    data: formData,
  };
};
