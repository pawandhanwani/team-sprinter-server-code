const mongoose = require('mongoose');
//const validator = require('validator');

const Sprint = mongoose.model('Sprint',{
    name : {
        type : String,
        trim : true,
        required : true
    },
    closed : {
        type : Boolean,
        required : true
    }
})


module.exports = Sprint;