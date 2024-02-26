/*
* PROG1935-23W-Sec5-Programming Dynamic Websites
* Purpose  : Assignment4 (Server-side))
* Revision History : version 1.0
* Written by       : Eunheui Jo
* Date             : Apr. 13. 2023 
*/

const express = require('express')
var path = require('path');

var myApp = express()
myApp.use(express.urlencoded({extended:false}));
myApp.listen(8080);
console.log('Express started on port 8080')

myApp.set('views', path.join(__dirname, 'views'));
myApp.use(express.static(path.join(__dirname+'/public')));
myApp.set('view engine', 'ejs');
const {check, validationResult } = require('express-validator');

// Set up Admin DB
var mongoose = require('mongoose')
mongoose.set('strictQuery', true);
mongoose.connect('mongodb://127.0.0.1:27017/prog1935_assignment4');
var OrderSchema = new mongoose.Schema({
    username: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    postcode: String,
    items: {names:[String],counts:[Number],priceapop:[Number],prices:[Number]}, 
    shippingCharge: Number, 
    subTotal: Number, 
    taxes: {rate:Number, amount:Number}, 
    total: Number,
    deliveryDate: String
  }, {timestamps: true});
const Admin = mongoose.model('admins', OrderSchema);

// Start Web Form

myApp.get('/', function(req,res){
    res.render('homepage');
});


// Post Web Form
myApp.post('/',[check('name', '* Please enter your name').not().isEmpty(), 
                check('address', '* Please enter address').not().isEmpty(), 
                check('city', '* Please enter city').not().isEmpty(), 
                check('postcode', '* Please enter postal code').not().isEmpty(), 
                check('email', '* Please enter an email address').not().isEmpty(),
                check('phone','* Please enter a phone number').not().isEmpty()]
        ,function(req,res){   

        const errors = validationResult(req);
        if (!errors.isEmpty()) {       
                res.render('order',{
                    name: req.body.name,
                    address: req.body.address,
                    city: req.body.city,
                    postcode:req.body.postcode,
                    email: req.body.email,
                    phone: req.body.phone,
                    errors:errors.array()});
        }
        else{

            //Save Data to Mongo DB
            var id = saveOrderData(req);
            if(id)
            {
                 //Open Receipt Page 
                var url = '/receipt/'+id;
                res.redirect(url);
            }
    }   
})

myApp.get('/ordermanager', function(req,res){
    res.render('order',{
        name: req.body.name,
        address: req.body.address,
        city: req.body.city,
        postcode:req.body.postcode,
        email: req.body.email,
        phone: req.body.phone,
        errors:""});
});

//Start Receipt Page
myApp.get('/receipt/:id', function(req,res){
    
    var id = req.params.id;

    //Retrieve Data From MongoDB
    // 1. Current Order Data
    Admin.findById({_id:id}).exec(async function(err,order){
       
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
            deliveryDate : order.deliveryDate
        }

        var name = order.username;
        var email = order.email;
       // 2. Retrieve Order History for a user who has the name and the email 
        var history = await Admin.find({username:name, email:email}).exec();
        res.render('receipt',{deal:curdeal, history: history});   
     
    })
     
})

const Tax = {
    AB: 3,
    BC: 12,
    MB: 12,
    NB: 15,
    NL: 15,
    NT: 05,
    NS: 15,
    NU: 5,
    ON: 13,
    PE: 15,
    QC: 14.975,
    SK: 11,
    YT: 5,
  };

const ProductNames = ["Orange Bag","Spinach","Strawberries"];
const ProductPrices = [20, 5, 13];
const ShippingCharge = 20;
const DeliveryTime = { '1 Day': 1, '2 Days': 2, '3 Days': 3 };

function saveOrderData(req)
{
    // Get Current Order Data
    var orderList =  getOrderList(req);

    //Calculate SubTotal, Tax, Total
    var subTotal = 0;
    for(let i=0; i<orderList.names.length ; i++)
    {
        subTotal += orderList.prices[i];
    }

    if( subTotal == 0 )
    {
        return -1;
    }

    subTotal += parseFloat(ShippingCharge);
    var taxrate =Tax[req.body.province];
    var tax = parseFloat(subTotal * taxrate/100);
    var total = subTotal + tax;

    // Calculate Estimated Delivery Date
    var today = new Date();
    var deliveryDate = today.getFullYear()+'-'+today.getMonth()+'-'+(today.getDate()+DeliveryTime[req.body.deliverytime]);
    
    // Save Current Order Data to DB
    var curorder = {
        username : req.body.name,
        email : req.body.email,
        phone : req.body.phone,
        address : req.body.address,
        city : req.body.city,
        postcode : req.body.postcode,
        items: {names:orderList.names,counts:orderList.counts,priceapop:orderList.priceapop,prices:orderList.prices}, 
        shippingCharge : ShippingCharge,
        subTotal : subTotal,
        taxes : {rate: taxrate, amount: tax},
        total : total, 
        deliveryDate : deliveryDate
    }
    var newDocument = new Admin(curorder);
    newDocument.save();

    // Return saved document ID
    return newDocument.id;
}

// Return ordered items' value on Web Form.
function getOrderList(req)
{
    var orderList = { 
        names : [String],
        counts: [String],
        priceapop: [Number],
        prices: [Number]
    }
   
    var idxItems = -1;
    if(req.body.product1 != '')
    {
        idxItems++;
        orderList.priceapop[idxItems] = ProductPrices[0];
        orderList.names[idxItems] = ProductNames[0];
        orderList.counts[idxItems] = req.body.product1;
        orderList.prices[idxItems] =  orderList.priceapop[idxItems] * orderList.counts[idxItems];
    }

    if((req.body.product2 != ''))
    {
        idxItems++;
        orderList.priceapop[idxItems] = ProductPrices[1];
        orderList.names[idxItems] = ProductNames[1];
        orderList.counts[idxItems] = req.body.product2;
        orderList.prices[idxItems] =  orderList.priceapop[idxItems] * orderList.counts[idxItems];
    }
    
    if((req.body.product3 != ''))
    {
        idxItems++;
        orderList.priceapop[idxItems] = ProductPrices[2];
        orderList.names[idxItems] = ProductNames[2];
        orderList.counts[idxItems] = req.body.product3;
        orderList.prices[idxItems] =  orderList.priceapop[idxItems] * orderList.counts[idxItems];
    }

    return orderList;
}
