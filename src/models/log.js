const mongoose = require('mongoose');

const Log = mongoose.model('Log',{
    sprintID : {
        type : Object,
        trim : true,
        ref : 'sprints'
    },
    description : {
        type : String,
        trim : true
    }
})

module.exports = Log;

