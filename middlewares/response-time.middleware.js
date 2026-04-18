const responseTimeMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const color =
      duration < 200
        ? "\x1b[32m" // hijau (bagus)
        : duration < 500
          ? "\x1b[33m" // kuning (oke)
          : "\x1b[31m"; // merah (lambat)
    const reset = "\x1b[0m";

    console.log(
      `${color}[${res.statusCode}] ${req.method} ${req.originalUrl} — ${duration}ms${reset}`,
    );
  });

  next();
};

module.exports = responseTimeMiddleware;
