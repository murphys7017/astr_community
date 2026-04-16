const parseExternalCoverUrl = (value) => {
  if (value === undefined || value === null) {
    return { valid: true, value: null };
  }

  if (typeof value !== 'string') {
    return { valid: false, value: null };
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return { valid: true, value: null };
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { valid: false, value: null };
    }

    return { valid: true, value: parsedUrl.toString() };
  } catch {
    return { valid: false, value: null };
  }
};

const pickTextPostCoverUrl = (coverUrl, images = []) => {
  if (typeof coverUrl === 'string' && coverUrl.trim()) {
    return coverUrl.trim();
  }

  if (!Array.isArray(images)) {
    return null;
  }

  const firstImage = images.find(imageUrl => typeof imageUrl === 'string' && imageUrl.trim());
  return firstImage ? firstImage.trim() : null;
};

module.exports = {
  parseExternalCoverUrl,
  pickTextPostCoverUrl
};
