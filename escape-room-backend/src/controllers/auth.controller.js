const authService = require("../services/auth.service");
const { success } = require("../utils/response");

function register(req, res, next) {
  authService.register(req.body, function (err, data) {
    if (err) return next(err);
    return success(res, 201, data);
  });
}

function verifyPhone(req, res, next) {
  authService.verifyPhone(req.body, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function login(req, res, next) {
  authService.login(req.body, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

function updateProfile(req, res, next) {
  authService.updateProfile(req.user.user_id, req.body, function (err, data) {
    if (err) return next(err);
    return success(res, 200, data);
  });
}

module.exports = {
  register,
  verifyPhone,
  login,
  updateProfile,
};
