export const healthCheck = (req, res) => {
  res.json({
    status: "ok",
    message: "SaaS backend is running"
  });
};
