const parseNimFromEmail = (email) => {
  const match = email.match(/^(\d{10})_/);
  return match ? match[1] : null;
};

const extractKodeFakultasProdi = (nim) => {
  if (!nim || nim.length < 6) return {};
  const kodeFakultas = nim.substring(3, 5);
  const kodeProdi = nim.substring(5, 6);
  return { kodeFakultas, kodeProdi };
};

const generateVerificationCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

module.exports = {
  parseNimFromEmail,
  extractKodeFakultasProdi,
  generateVerificationCode,
};
