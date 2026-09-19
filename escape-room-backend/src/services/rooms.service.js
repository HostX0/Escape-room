// Both room availability routes use the same Baghdad day boundaries and public-safe fields.
const { listAvailability } = require('./bookings.service');
module.exports = { getRoomAvailability: listAvailability };
