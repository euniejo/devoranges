const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Admin = require('../models/orderModel');

// Set up Admin DB
const mongoose = require('mongoose');
mongoose.set('strictQuery', true);

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/orderDB', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('MongoDB connected');
    })
    .catch(err => console.error('MongoDB connection error:', err));

router.get('/', function (req, res) {
    res.render('order', {
        name: '',
        address: '',
        city: '',
        postcode: '',
        email: '',
        phone: '',
        errors: ''
    });
});

router.post('/', [
    check('name', '* Please enter your name').not().isEmpty(),
    check('address', '* Please enter address').not().isEmpty(),
    check('city', '* Please enter city').not().isEmpty(),
    check('postcode', '* Please enter postal code').not().isEmpty(),
    check('email', '* Please enter an email address').not().isEmpty(),
    check('phone', '* Please enter a phone number').not().isEmpty()
], async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.render('order', {
            name: req.body.name,
            address: req.body.address,
            city: req.body.city,
            postcode: req.body.postcode,
            email: req.body.email,
            phone: req.body.phone,
            errors: errors.array()
        });
    } else {
        try {
            const id = await saveOrderData(req);
            if (id) {
                const url = '/ordermanager/receipt/' + id;
                res.redirect(url); // Corrected line
            }
        } catch (error) {
            console.error('Error saving order:', error);
            res.status(500).send('Internal Server Error');
        }
    }
});

// Start Receipt Page
router.get('/receipt/:id', function (req, res) {
    var id = req.params.id;

    // Retrieve Data From MongoDB
    // 1. Current Order Data
    Admin.findById({ _id: id }).exec(async function (err, order) {
        var curdeal = {
            username: order.username,
            email: order.email,
            phone: order.phone,
            address: order.address,
            city: order.city,
            postcode: order.postcode,
            items: order.items,
            shippingCharge: order.shippingCharge,
            subTotal: order.subTotal,
            taxes: order.taxes,
            total: order.total,
            deliveryDate: order.deliveryDate
        };

        var name = order.username;
        var email = order.email;
        // 2. Retrieve Order History for a user who has the name and the email 
        var history = await Admin.find({ username: name, email: email }).exec();
        res.render('receipt', { deal: curdeal, history: history });
    });
});

const Tax = {
    AB: 3,
    BC: 12,
    MB: 12,
    NB: 15,
    NL: 15,
    NT: 5,
    NS: 15,
    NU: 5,
    ON: 13,
    PE: 15,
    QC: 14.975,
    SK: 11,
    YT: 5,
};
const ProductNames = ["Orange Bag", "Spinach", "Strawberries"];
const ProductPrices = [20, 5, 13];
const ShippingCharge = 20;
const DeliveryTime = { '1 Day': 1, '2 Days': 2, '3 Days': 3 };

async function saveOrderData(req) {
    try {
        // Get Current Order Data
        var orderList = getOrderList(req);

        // Calculate SubTotal, Tax, Total
        var subTotal = 0;
        for (let i = 0; i < orderList.names.length; i++) {
            subTotal += orderList.prices[i];
        }

        if (subTotal == 0) {
            return -1;
        }

        subTotal += parseFloat(ShippingCharge);
        var taxrate = Tax[req.body.province];
        var tax = parseFloat(subTotal * taxrate / 100);
        var total = subTotal + tax;

        // Calculate Estimated Delivery Date
        var today = new Date();
        var deliveryDate = today.getFullYear() + '-' + today.getMonth() + '-' + (today.getDate() + DeliveryTime[req.body.deliverytime]);

        // Save Current Order Data to DB
        var curorder = {
            username: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            address: req.body.address,
            city: req.body.city,
            postcode: req.body.postcode,
            items: { names: orderList.names, counts: orderList.counts, priceapop: orderList.priceapop, prices: orderList.prices },
            shippingCharge: ShippingCharge,
            subTotal: subTotal,
            taxes: { rate: taxrate, amount: tax },
            total: total,
            deliveryDate: deliveryDate
        };

        const newDocument = await Admin.create(curorder);
        // Return saved document ID
        return newDocument.id;
    } catch (error) {
        throw error;
    }
}

// Return ordered items' value on Web Form.
function getOrderList(req) {
    var orderList = {
        names: [],
        counts: [],
        priceapop: [],
        prices: []
    };

    if (req.body.product1 != '') {
        orderList.priceapop.push(ProductPrices[0]);
        orderList.names.push(ProductNames[0]);
        orderList.counts.push(req.body.product1);
        orderList.prices.push(orderList.priceapop[0] * orderList.counts[0]);
    }

    if (req.body.product2 != '') {
        orderList.priceapop.push(ProductPrices[1]);
        orderList.names.push(ProductNames[1]);
        orderList.counts.push(req.body.product2);
        orderList.prices.push(orderList.priceapop[1] * orderList.counts[1]);
    }

    if (req.body.product3 != '') {
        orderList.priceapop.push(ProductPrices[2]);
        orderList.names.push(ProductNames[2]);
        orderList.counts.push(req.body.product3);
        orderList.prices.push(orderList.priceapop[2] * orderList.counts[2]);
    }

    return orderList;
}

module.exports = router;
