const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    username: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    postcode: String,
    items: { names: [String], counts: [Number], priceapop: [Number], prices: [Number] },
    shippingCharge: Number,
    subTotal: Number,
    taxes: { rate: Number, amount: Number },
    total: Number,
    deliveryDate: String
}, { timestamps: true });

const Admin = mongoose.model('admins', orderSchema);

module.exports = Admin;
