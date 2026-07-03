function errorHandler(err, req, res, next) {
  console.error("[error]", err);

  res.status(500).json({
    error: "Something went wrong on our end. Please try again later.",
  });
}

module.exports = { errorHandler };