const express = require('express');
const path = require('path');
const homeController = require('./controllers/homeController');
const orderController = require('./controllers/orderController');

const app = express();
const PORT = process.env.PORT || 3000;

// Start the Express server after successful MongoDB connection
    app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static files setup
app.use(express.static(path.join(__dirname, 'public')));

// Body parser setup
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/', homeController);
app.use('/ordermanager', orderController);

module.exports = app;
