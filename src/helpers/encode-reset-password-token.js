
module.exports = encodeResetPasswordToken;

function encodeResetPasswordToken (id, token) {
  return `${id}___${token}`;
}
